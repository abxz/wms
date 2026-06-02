"""基础数据管理模块 — 部门/岗位/角色"""
import json
from fastapi import APIRouter, HTTPException
from core.database import get_by, add, update
from core.utils import generate_id

router = APIRouter(prefix="/api/master-config", tags=["基础数据管理"])

VALID_TYPES = {"departments", "positions", "roles", "job_types"}


def _get_list(config_type: str) -> list:
    """从 system_config 表读取 JSON 数组"""
    row = get_by("system_config", "key", config_type)
    if row:
        try:
            return json.loads(row.get("value", "[]"))
        except (json.JSONDecodeError, TypeError):
            return []
    return []


def _save_list(config_type: str, items: list):
    """保存 JSON 数组到 system_config 表"""
    row = get_by("system_config", "key", config_type)
    val = json.dumps(items, ensure_ascii=False)
    if row:
        update("system_config", row["id"], {"value": val})
    else:
        add("system_config", {"id": generate_id(), "key": config_type, "value": val})


def register(app):
    app.include_router(router)


@router.get("/{config_type}")
def route_get(config_type: str):
    if config_type not in VALID_TYPES:
        raise HTTPException(400, f"无效类型: {config_type}")
    return {"items": _get_list(config_type)}


@router.post("/{config_type}", status_code=201)
def route_add(config_type: str, body: dict):
    if config_type not in VALID_TYPES:
        raise HTTPException(400, f"无效类型: {config_type}")
    name = (body.get("name") or "").strip()
    if not name:
        raise HTTPException(400, "名称不能为空")
    items = _get_list(config_type)
    if name in items:
        raise HTTPException(400, f"'{name}'已存在")
    items.append(name)
    _save_list(config_type, items)
    return {"items": items}


@router.delete("/{config_type}/{name}")
def route_delete(config_type: str, name: str):
    if config_type not in VALID_TYPES:
        raise HTTPException(400, f"无效类型: {config_type}")
    # 删除保护：检查是否有关联员工
    from core.database import all_
    employees = all_("employees")
    FIELD_MAP = {
        "departments": "department",
        "positions": "position",
        "job_types": "job_type",
        "roles": "role",
    }
    field = FIELD_MAP.get(config_type)
    if field:
        count = len([e for e in employees if e.get(field) == name])
        if count > 0:
            raise HTTPException(400, f"该{config_type}关联了 {count} 名员工，无法删除。请先转移员工。")
    items = _get_list(config_type)
    if name not in items:
        raise HTTPException(404, f"'{name}'不存在")
    items.remove(name)
    _save_list(config_type, items)
    return {"items": items}
