"""系统配置模块"""
from fastapi import APIRouter, HTTPException
from core.config import DATA_DIR
import json

router = APIRouter(prefix="/api/system", tags=["系统配置"])

def register(app):
    app.include_router(router)

def _get_config() -> dict:
    path = DATA_DIR / "system_config.json"
    if not path.exists():
        return {
            "inbound_start_no": "IN-0001",
            "inbound_current_no": "IN-0001",
            "outbound_start_no": "OUT-0001",
            "outbound_current_no": "OUT-0001",
            "max_items_per_order": 7
        }
    with open(path) as f:
        return json.load(f)

def _save_config(config: dict):
    path = DATA_DIR / "system_config.json"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(config, f, ensure_ascii=False, indent=2)

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
