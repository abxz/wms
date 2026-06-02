"""劳保用品管理模块"""
from fastapi import APIRouter, Query, HTTPException
from modules.labor_protection import service as svc

router = APIRouter(prefix="/api/labor", tags=["劳保用品"])


def register(app):
    app.include_router(router)


# ── 劳保用品目录 ──────────────────────────────────────────────────────────────

@router.get("/supplies")
def list_supplies(page: int = Query(1, ge=1), size: int = Query(20, ge=1, le=100), search: str = ""):
    return svc.list_supplies(page, size, search)

@router.get("/supplies/all")
def list_all_supplies():
    return svc.list_all_supplies()

@router.get("/supplies/low-stock")
def get_low_stock():
    """获取库存低于阈值的用品"""
    return svc.get_low_stock_supplies()

@router.get("/supplies/{sid}")
def get_supply(sid: str):
    s = svc.get_supply(sid)
    if not s:
        raise HTTPException(404, "劳保用品不存在")
    return s

@router.post("/supplies", status_code=201)
def create_supply(body: dict):
    return svc.create_supply(body)

@router.put("/supplies/{sid}")
def update_supply(sid: str, body: dict):
    s = svc.update_supply(sid, body)
    if not s:
        raise HTTPException(404, "劳保用品不存在")
    return s

@router.delete("/supplies/{sid}")
def delete_supply(sid: str):
    if not svc.delete_supply(sid):
        raise HTTPException(404, "劳保用品不存在")
    return {"ok": True}

@router.post("/supplies/init-gb")
def init_gb():
    """初始化国标默认劳保用品"""
    count = svc.init_gb_defaults()
    return {"added": count}


# ── 岗位配置 ──────────────────────────────────────────────────────────────────

@router.get("/configs")
def list_configs(page: int = Query(1, ge=1), size: int = Query(20, ge=1, le=100), search: str = ""):
    return svc.list_configs(page, size, search)

@router.get("/configs/all")
def list_all_configs():
    return svc.list_all_configs()

@router.get("/configs/position/{position}")
def get_position_configs(position: str):
    return svc.get_configs_by_position(position)

@router.get("/configs/{cid}")
def get_config(cid: str):
    c = svc.get_config(cid)
    if not c:
        raise HTTPException(404, "配置不存在")
    return c

@router.post("/configs", status_code=201)
def create_config(body: dict):
    return svc.create_config(body)

@router.put("/configs/{cid}")
def update_config(cid: str, body: dict):
    c = svc.update_config(cid, body)
    if not c:
        raise HTTPException(404, "配置不存在")
    return c

@router.delete("/configs/{cid}")
def delete_config(cid: str):
    if not svc.delete_config(cid):
        raise HTTPException(404, "配置不存在")
    return {"ok": True}


# ── 领取记录 ──────────────────────────────────────────────────────────────────

@router.get("/distributions")
def list_distributions(page: int = Query(1, ge=1), size: int = Query(20, ge=1, le=100), search: str = ""):
    return svc.list_distributions(page, size, search)

@router.get("/distributions/{did}")
def get_distribution(did: str):
    d = svc.get_distribution(did)
    if not d:
        raise HTTPException(404, "记录不存在")
    return d

@router.post("/distribute")
def distribute(body: dict):
    """员工领取劳保用品"""
    try:
        return svc.distribute(body)
    except ValueError as e:
        raise HTTPException(400, str(e))

@router.get("/pending")
def get_pending(position: str = Query("", description="按岗位过滤")):
    """获取待领取列表（过期/即将到期）"""
    return svc.get_employee_pending(position)
