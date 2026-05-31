"""库存变动审计日志模块"""
from fastapi import APIRouter, Query, HTTPException
from core.database import all_, add, paginate
from core.utils import generate_id
from datetime import datetime

router = APIRouter(prefix="/api/stock-mutations", tags=["库存审计"])

MUTATIONS_FILE = "stock_mutations.json"

def register(app):
    app.include_router(router)

def log_mutation(type: str, ref_id: str, product_id: str, qty_before: int,
                 qty_change: int, qty_after: int, operator_name: str,
                 source: str = "pda", detail: str = ""):
    """记录一条库存变动（只追加，不修改）"""
    record = {
        "id": generate_id(),
        "type": type,
        "ref_id": ref_id,
        "product_id": product_id,
        "qty_before": qty_before,
        "qty_change": qty_change,
        "qty_after": qty_after,
        "operator_name": operator_name,
        "source": source,
        "timestamp": datetime.now().isoformat(timespec="seconds"),
        "detail": detail
    }
    return add(MUTATIONS_FILE, record)

@router.get("")
def list_mutations(page: int = Query(1, ge=1), size: int = Query(20, ge=1, le=100),
                   product_id: str = "", type: str = "",
                   operator: str = ""):
    data = all_(MUTATIONS_FILE)
    if product_id:
        data = [d for d in data if d.get("product_id") == product_id]
    if type:
        data = [d for d in data if d.get("type") == type]
    if operator:
        data = [d for d in data if operator in d.get("operator_name", "")]
    data.sort(key=lambda d: d.get("timestamp", ""), reverse=True)
    total = len(data)
    page = max(1, page)
    size = max(1, min(size, 100))
    start = (page - 1) * size
    return {
        "items": data[start:start + size],
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size
    }
