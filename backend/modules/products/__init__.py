"""商品管理模块"""
from fastapi import APIRouter, Query, HTTPException
from modules.products import service as svc

router = APIRouter(prefix="/api/products", tags=["商品管理"])


def register(app):
    app.include_router(router)


@router.get("")
def route_list(page: int = Query(1, ge=1), size: int = Query(20, ge=1, le=100), search: str = ""):
    return svc.list_products(page, size, search)


@router.get("/{pid}")
def route_get(pid: str):
    p = svc.get_product(pid)
    if not p:
        raise HTTPException(404, "商品不存在")
    return p


@router.post("", status_code=201)
def route_create(body: dict):
    return svc.create_product(body)


@router.put("/{pid}")
def route_update(pid: str, body: dict):
    p = svc.update_product(pid, body)
    if not p:
        raise HTTPException(404, "商品不存在")
    return p


@router.delete("/{pid}")
def route_delete(pid: str):
    if not svc.delete_product(pid):
        raise HTTPException(404, "商品不存在")
    return {"ok": True}
