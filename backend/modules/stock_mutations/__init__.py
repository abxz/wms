"""库存变动审计日志模块 — PostgreSQL backend"""
from fastapi import APIRouter, Query
from core.database import all_, add, paginate
from core.utils import generate_id
from datetime import datetime

router = APIRouter(prefix="/api/stock-mutations", tags=["库存审计"])

TABLE = "stock_mutations"

def register(app):
    app.include_router(router)

def log_mutation(type: str, ref_id: str, product_id: str, qty_before,
                 qty_change, qty_after, operator_name: str,
                 source: str = "pda", detail: str = ""):
    record = {
        "id": generate_id(),
        "type": type,
        "ref_id": ref_id,
        "product_id": product_id,
        "delta": float(qty_change),
        "remark": detail,
        "created_at": datetime.now().isoformat(timespec="seconds"),
    }
    return add(TABLE, record)

@router.get("")
def list_mutations(page: int = Query(1, ge=1), size: int = Query(20, ge=1, le=100),
                   product_id: str = "", type: str = "", operator: str = ""):
    data = all_(TABLE)
    if product_id:
        data = [d for d in data if d.get("product_id") == product_id]
    if type:
        data = [d for d in data if d.get("type") == type]
    data.sort(key=lambda d: d.get("created_at", ""), reverse=True)
    total = len(data)
    start = (page - 1) * size
    return {
        "items": data[start:start + size],
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size,
    }
