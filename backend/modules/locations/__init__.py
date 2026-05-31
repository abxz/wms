"""库位管理模块"""
from fastapi import APIRouter, Query, HTTPException
from modules.locations import service as svc

router = APIRouter(prefix="/api/locations", tags=["库位管理"])

def register(app):
    app.include_router(router)

@router.get("")
def route_list(page: int = Query(1, ge=1), size: int = Query(20, ge=1, le=100), search: str = ""):
    return svc.list_locations(page, size, search)

@router.get("/history/usage")
def usage_history():
    """返回所有历史使用地点（去重+按频率排序），供 Combobox 使用"""
    from core.database import all_
    data = all_("outbound.json")
    locations = {}
    for d in data:
        loc = d.get("usage_location", "").strip()
        if loc:
            locations[loc] = locations.get(loc, 0) + 1
    sorted_locs = sorted(locations.keys(), key=lambda k: locations[k], reverse=True)
    return {"items": sorted_locs[:50]}

@router.get("/{lid}")
def route_get(lid: str):
    loc = svc.get_location(lid)
    if not loc:
        raise HTTPException(404, "库位不存在")
    return loc

@router.post("", status_code=201)
def route_create(body: dict):
    return svc.create_location(body)

@router.put("/{lid}")
def route_update(lid: str, body: dict):
    loc = svc.update_location(lid, body)
    if not loc:
        raise HTTPException(404, "库位不存在")
    return loc

@router.delete("/{lid}")
def route_delete(lid: str):
    if not svc.delete_location(lid):
        raise HTTPException(404, "库位不存在")
    return {"ok": True}
