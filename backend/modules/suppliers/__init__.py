"""供应商管理模块"""
from fastapi import APIRouter, Query, HTTPException
from modules.suppliers import service as svc

router = APIRouter(prefix="/api/suppliers", tags=["供应商"])

def register(app):
    app.include_router(router)

@router.get("")
def route_list(page: int = Query(1, ge=1), size: int = Query(20, ge=1, le=100), search: str = ""):
    return svc.list_suppliers(page, size, search)

@router.get("/{sid}")
def route_get(sid: str):
    s = svc.get_supplier(sid)
    if not s:
        raise HTTPException(404, "供应商不存在")
    return s

@router.post("", status_code=201)
def route_create(body: dict):
    return svc.create_supplier(body)

@router.put("/{sid}")
def route_update(sid: str, body: dict):
    s = svc.update_supplier(sid, body)
    if not s:
        raise HTTPException(404, "供应商不存在")
    return s

@router.delete("/{sid}")
def route_delete(sid: str):
    # 删除保护：检查是否有关联商品
    from core.database import all_
    related = [p for p in all_("products") if p.get("supplier_id") == sid]
    if related:
        raise HTTPException(400, f"该供应商关联了 {len(related)} 个商品，无法删除。请先解除关联。")
    if not svc.delete_supplier(sid):
        raise HTTPException(404, "供应商不存在")
    return {"ok": True}
