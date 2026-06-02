"""出库管理模块"""
from fastapi import APIRouter, Query, HTTPException
from modules.outbound import service as svc

router = APIRouter(prefix="/api/outbound", tags=["出库管理"])

def register(app):
    app.include_router(router)

@router.get("")
def route_list(page: int = Query(1, ge=1), size: int = Query(20, ge=1, le=100), search: str = ""):
    return svc.list_outbound(page, size, search)

@router.get("/{oid}")
def route_get(oid: str):
    order = svc.get_outbound(oid)
    if not order:
        raise HTTPException(404, "出库单不存在")
    return order

@router.post("", status_code=201)
def route_create(body: dict):
    try:
        return svc.create_outbound(body)
    except ValueError as e:
        raise HTTPException(400, str(e))

@router.put("/{oid}/complete")
def route_complete(oid: str):
    try:
        order = svc.complete_outbound(oid)
        if not order:
            raise HTTPException(404, "出库单不存在")
        return order
    except ValueError as e:
        raise HTTPException(400, str(e))

@router.post("/batch", status_code=201)
def route_batch_create(body: dict):
    """批量创建出库单（拆单提交）"""
    items = body.get("items", [])
    max_items = body.get("max_items", 7)
    prefix = "OUT"
    shared = {k: v for k, v in body.items() if k not in ("items", "max_items")}
    
    from core.split_order import split_order_items, batch_submit_orders
    chunks = split_order_items(items, max_items, prefix)
    results = batch_submit_orders(chunks, "outbound", shared)
    return {"orders": results}
