"""系统配置模块 — PostgreSQL backend"""
from fastapi import APIRouter
from core.database import all_, add, update, get_by
from core.utils import generate_id

router = APIRouter(prefix="/api/system", tags=["系统配置"])

_DEFAULTS = {
    "inbound_start_no": "IN-0001",
    "inbound_current_no": "IN-0001",
    "outbound_start_no": "OUT-0001",
    "outbound_current_no": "OUT-0001",
    "max_items_per_order": "7",
}

def register(app):
    app.include_router(router)

def _get_config() -> dict:
    rows = all_("system_config")
    result = dict(_DEFAULTS)
    for row in rows:
        result[row["key"]] = row["value"]
    return result

def _save_config(config: dict):
    for k, v in config.items():
        existing = get_by("system_config", "key", k)
        if existing:
            update("system_config", existing["id"], {"value": str(v)})
        else:
            add("system_config", {"id": generate_id(), "key": k, "value": str(v)})

@router.get("/config")
def get_config():
    return _get_config()

@router.put("/config")
def update_config(body: dict):
    config = _get_config()
    allowed = ["inbound_start_no", "inbound_current_no",
               "outbound_start_no", "outbound_current_no",
               "max_items_per_order"]
    for k in allowed:
        if k in body:
            config[k] = body[k]
    _save_config(config)
    return config
