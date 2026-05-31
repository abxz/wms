"""JSON 文件存储引擎 —— 零数据库依赖"""
import json
import threading
from pathlib import Path
from typing import Any, Optional
from datetime import datetime
from core.config import DATA_DIR

_lock = threading.Lock()


def _ts() -> str:
    return datetime.now().isoformat(timespec="seconds")


def _load(file: str) -> list[dict]:
    path = DATA_DIR / file
    if not path.exists():
        return []
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _save(file: str, data: list[dict]):
    """原子写入：临时文件 → rename 替换，防止写一半崩溃导致文件损坏"""
    path = DATA_DIR / file
    tmp = path.with_suffix(".tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    tmp.rename(path)


# ─── 公共 CRUD ────────────────────────────────────────────────

def all_(file: str) -> list[dict]:
    return _load(file)


def get_by(file: str, field: str, value: Any) -> Optional[dict]:
    for item in _load(file):
        if item.get(field) == value:
            return item
    return None


def get_by_id(file: str, id: str) -> Optional[dict]:
    return get_by(file, "id", id)


def add(file: str, record: dict) -> dict:
    with _lock:
        data = _load(file)
        from core.utils import generate_id
        record.setdefault("id", generate_id())
        record.setdefault("created_at", _ts())
        record.setdefault("updated_at", _ts())
        data.append(record)
        _save(file, data)
    return record


def update(file: str, id: str, updates: dict) -> Optional[dict]:
    with _lock:
        data = _load(file)
        for item in data:
            if item["id"] == id:
                item.update(updates)
                item["updated_at"] = _ts()
                _save(file, data)
                return item
    return None


def delete(file: str, id: str) -> bool:
    with _lock:
        data = _load(file)
        new_data = [d for d in data if d["id"] != id]
        if len(new_data) == len(data):
            return False
        _save(file, new_data)
    return True


def query(file: str, **filters) -> list[dict]:
    """按条件过滤"""
    data = _load(file)
    for k, v in filters.items():
        if v is not None:
            data = [d for d in data if d.get(k) == v]
    return data


def atomic_modify(file: str, record_id: str, modifier):
    """原子读-改-写：在同一个锁内完成查找、修改、保存，防止并发丢失更新
    
    modifier 接收当前 dict，返回修改后的 dict（或 None 表示不修改）
    """
    with _lock:
        data = _load(file)
        for i, item in enumerate(data):
            if item["id"] == record_id:
                new = modifier(dict(item))
                if new is not None:
                    new["updated_at"] = _ts()
                    data[i] = new
                    _save(file, data)
                    return new
                return item
    return None


def atomic_check_and_deduct(file: str, product_id: str, requested_qty: float) -> bool:
    """原子检查库存并扣减（防超卖）
    返回 True 表示扣减成功，False 表示库存不足或商品不存在
    """
    with _lock:
        data = _load(file)
        for i, item in enumerate(data):
            if item.get("product_id") == product_id:
                current = item.get("quantity", 0)
                if current < requested_qty:
                    return False
                item["quantity"] = current - requested_qty
                item["updated_at"] = _ts()
                data[i] = item
                _save(file, data)
                return True
        # 没有库存记录，无法出库
        return False


def paginate(file: str, page: int = 1, size: int = 20, search: str = "",
             sort_by: str = "updated_at", sort_desc: bool = True,
             search_fields: list[str] | None = None) -> dict:
    """分页 + 搜索 + 排序"""
    data = _load(file)
    if search and search_fields:
        search = search.lower()
        data = [d for d in data if any(
            search in str(d.get(f, "")).lower() for f in search_fields
        )]
    if sort_by:
        data.sort(key=lambda d: d.get(sort_by, ""), reverse=sort_desc)
    total = len(data)
    start = (page - 1) * size
    items = data[start:start + size]
    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size,
    }
