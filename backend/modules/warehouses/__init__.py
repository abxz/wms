"""仓库管理模块"""
from fastapi import APIRouter, Query, HTTPException
from modules.warehouses import service as svc

router = APIRouter(prefix="/api/warehouses", tags=["仓库管理"])


def register(app):
    app.include_router(router)


@router.get("")
def route_list(page: int = Query(1, ge=1), size: int = Query(20, ge=1, le=100), search: str = ""):
    return svc.list_warehouses(page, size, search)


@router.get("/all")
def route_all():
    """获取所有仓库（供下拉选择）"""
    return svc.get_all_warehouses()


@router.get("/{wid}")
def route_get(wid: str):
    w = svc.get_warehouse(wid)
    if not w:
        raise HTTPException(404, "仓库不存在")
    return w


@router.post("", status_code=201)
def route_create(body: dict):
    return svc.create_warehouse(body)


@router.put("/{wid}")
def route_update(wid: str, body: dict):
    w = svc.update_warehouse(wid, body)
    if not w:
        raise HTTPException(404, "仓库不存在")
    return w


@router.delete("/{wid}")
def route_delete(wid: str):
    try:
        if not svc.delete_warehouse(wid):
            raise HTTPException(404, "仓库不存在")
        return {"ok": True}
    except ValueError as e:
        raise HTTPException(400, str(e))
