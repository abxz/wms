"""入库管理模块"""
from fastapi import APIRouter, Query, HTTPException
from modules.inbound import service as svc

router = APIRouter(prefix="/api/inbound", tags=["入库管理"])

def register(app):
    app.include_router(router)

@router.get("")
def route_list(page: int = Query(1, ge=1), size: int = Query(20, ge=1, le=100), search: str = ""):
    return svc.list_inbound(page, size, search)

@router.get("/{oid}")
def route_get(oid: str):
    order = svc.get_inbound(oid)
    if not order:
        raise HTTPException(404, "入库单不存在")
    return order

@router.post("", status_code=201)
def route_create(body: dict):
    return svc.create_inbound(body)

@router.put("/{oid}/complete")
def route_complete(oid: str):
    order = svc.complete_inbound(oid)
    if not order:
        raise HTTPException(404, "入库单不存在")
    return order

@router.delete("/{oid}")
def route_cancel(oid: str):
    if not svc.cancel_inbound(oid):
        raise HTTPException(404, "入库单不存在或已完成")
    return {"ok": True}

@router.post("/batch", status_code=201)
def route_batch_create(body: dict):
    """批量创建入库单（拆单提交）"""
    items = body.get("items", [])
    max_items = body.get("max_items", 7)
    shared = {k: v for k, v in body.items() if k not in ("items", "max_items")}
    
    from core.split_order import split_order_items, batch_submit_orders
    chunks = split_order_items(items, max_items, "IN")
    results = batch_submit_orders(chunks, "inbound", shared)
    return {"orders": results}
