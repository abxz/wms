"""库存业务逻辑"""
from core.database import all_, get_by, get_by_id, add, update, delete, paginate, atomic_modify
from modules.inventory.model import Inventory
from core.utils import generate_id
from datetime import datetime

FILE = "inventory"
SEARCH_FIELDS = ["product_id", "location_id"]

def _ts():
    return datetime.now().isoformat(timespec="seconds")

def get_all_inventory():
    return all_(FILE)

def get_inventory_by_product(pid: str):
    return get_by(FILE, "product_id", pid)

def get_inventory_by_location(lid: str):
    return [i for i in all_(FILE) if i.get("location_id") == lid]

def get_alerts(threshold=None):
    """获取库存预警：低于商品 min_stock 或超过 max_stock"""
    data = all_(FILE)
    products = {p["id"]: p for p in all_("products")}
    alerts = []
    for inv in data:
        pid = inv.get("product_id", "")
        qty = inv.get("quantity", 0)
        prod = products.get(pid, {})
        min_stock = prod.get("min_stock", threshold or 10)
        max_stock = prod.get("max_stock", 999999)
        if qty < min_stock:
            alerts.append({
                **inv,
                "product_name": prod.get("name", ""),
                "min_stock": min_stock,
                "level": "low",
            })
        elif qty > max_stock:
            alerts.append({
                **inv,
                "product_name": prod.get("name", ""),
                "max_stock": max_stock,
                "level": "high",
            })
    return alerts

def adjust_inventory(product_id: str, location_id: str, quantity: float):
    """盘点调整：设置绝对数量（原子操作）"""
    inv = get_by(FILE, "product_id", product_id)
    if inv and inv.get("location_id") == location_id:
        return atomic_modify(FILE, inv["id"], lambda d: {**d, "quantity": quantity})
    new = Inventory(id=generate_id(), product_id=product_id, quantity=quantity, location_id=location_id, updated_at=_ts())
    return add(FILE, new.model_dump())

def update_stock(product_id: str, delta: float, location_id: str = ""):
    """原子更新库存（delta：正数加库存，负数减库存）"""
    inv = get_by(FILE, "product_id", product_id)
    if inv:
        if location_id:
            invs = [i for i in all_(FILE) if i.get("product_id") == product_id]
            match = next((i for i in invs if i.get("location_id") == location_id), inv)
            return atomic_modify(FILE, match["id"], lambda d: {**d, "quantity": max(0, d.get("quantity", 0) + delta)})
        return atomic_modify(FILE, inv["id"], lambda d: {**d, "quantity": max(0, d.get("quantity", 0) + delta)})
    new = Inventory(id=generate_id(), product_id=product_id, quantity=max(0, delta), location_id=location_id, updated_at=_ts())
    return add(FILE, new.model_dump())
