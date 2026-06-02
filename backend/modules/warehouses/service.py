"""仓库业务逻辑"""
from core.database import all_, get_by_id, add, update, delete, paginate
from core.utils import generate_id

FILE = "warehouses"
SEARCH_FIELDS = ["name", "code", "address"]


def list_warehouses(page=1, size=20, search=""):
    return paginate(FILE, page, size, search, search_fields=SEARCH_FIELDS)


def get_warehouse(wid: str):
    return get_by_id(FILE, wid)


def get_all_warehouses():
    return all_(FILE)


def create_warehouse(data: dict) -> dict:
    data["id"] = generate_id()
    data.setdefault("active", True)
    data.setdefault("address", "")
    data.setdefault("contact", "")
    data.setdefault("phone", "")
    data.setdefault("remark", "")
    return add(FILE, data)


def update_warehouse(wid: str, data: dict) -> dict | None:
    return update(FILE, wid, data)


def delete_warehouse(wid: str) -> bool:
    """删除仓库前检查是否有商品引用"""
    products = all_("products")
    refs = [p for p in products if p.get("warehouse_id") == wid]
    if refs:
        names = ", ".join(p.get("name", "?") for p in refs[:5])
        extra = f" 等 {len(refs)} 个" if len(refs) > 5 else ""
        raise ValueError(f"仓库正在被商品引用：{names}{extra}，请先移除关联")
    return delete(FILE, wid)
