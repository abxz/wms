"""商品业务逻辑"""
from core.database import all_, get_by_id, add, update, delete, paginate
from modules.products.model import Product
from core.utils import generate_id
from uuid import uuid4

FILE = "products"
SEARCH_FIELDS = ["name", "sku", "barcode", "category", "spec", "invoice_number"]


def _enrich_product(p: dict) -> dict:
    """聚合库存/仓库/库位/状态数据"""
    pid = p.get("id", "")

    # 剩余库存：从 inventory 表按 product_id 汇总
    stock_quantity = 0
    for inv in all_("inventory"):
        if inv.get("product_id") == pid:
            stock_quantity += float(inv.get("quantity", 0))

    # 警戒库存
    min_stock = float(p.get("min_stock", 0))

    # 存仓仓库名称
    warehouse_name = ""
    warehouse_id = p.get("warehouse_id", "")
    if warehouse_id:
        for wh in all_("warehouses"):
            if wh.get("id") == warehouse_id:
                warehouse_name = wh.get("name", "")
                break

    # 库位编码
    location_code = ""
    location_id = p.get("location_id", "")
    if location_id:
        for loc in all_("locations"):
            if loc.get("id") == location_id:
                location_code = loc.get("code", "")
                break

    # 状态计算
    active = p.get("active", True)
    if not active:
        status = "下架"
    elif stock_quantity <= min_stock:
        status = "缺货"
    else:
        status = "上架"

    p["stock_quantity"] = stock_quantity
    p["min_stock"] = min_stock
    p["warehouse_name"] = warehouse_name
    p["location_code"] = location_code
    p["status"] = status
    return p


def list_products(page=1, size=20, search="", warehouse_id=""):
    result = paginate(FILE, page, size, search, search_fields=SEARCH_FIELDS)
    items = result.get("items", [])

    # 仓库筛选
    if warehouse_id:
        items = [p for p in items if p.get("warehouse_id") == warehouse_id]

    # 聚合额外字段
    items = [_enrich_product(p) for p in items]
    result["items"] = items
    return result


def get_product(pid: str):
    p = get_by_id(FILE, pid)
    if p:
        return _enrich_product(p)
    return None


def create_product(data: dict) -> dict:
    p = Product(**data)
    p.id = generate_id()
    if not p.qr_uuid:
        p.qr_uuid = uuid4().hex[:12]
    d = p.model_dump()
    d.pop("created_at", None)
    d.pop("updated_at", None)
    return add(FILE, d)


def update_product(pid: str, data: dict) -> dict | None:
    return update(FILE, pid, data)


def delete_product(pid: str) -> bool:
    return delete(FILE, pid)


def get_all_products() -> list[dict]:
    return [_enrich_product(p) for p in all_(FILE)]


def get_by_qr_uuid(qr_uuid: str) -> dict | None:
    """扫码时按 QR 永久 UUID 查找商品"""
    for p in all_(FILE):
        if p.get("qr_uuid") == qr_uuid:
            return _enrich_product(p)
    return None
