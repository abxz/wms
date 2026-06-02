"""入库业务逻辑"""
from core.database import all_, get_by_id, add, update, paginate
from modules.inbound.model import InboundOrder
from core.utils import generate_id, generate_order_no
from modules.inventory.service import update_stock
from datetime import datetime

FILE = "inbound"
SEARCH_FIELDS = ["order_no", "supplier_id", "status"]

def _ts():
    return datetime.now().isoformat(timespec="seconds")

def list_inbound(page=1, size=20, search=""):
    return paginate(FILE, page, size, search, search_fields=SEARCH_FIELDS)

def get_inbound(oid: str):
    return get_by_id(FILE, oid)

def create_inbound(data: dict) -> dict:
    order = InboundOrder(**data)
    order.id = generate_id()
    order.order_no = generate_order_no("IN")
    if order.items:
        order.total_amount = sum(
            float(i.get("price", 0)) * float(i.get("quantity", 0))
            for i in order.items
        )
    d = order.model_dump()
    d.pop("created_at", None)
    d.pop("updated_at", None)
    return add(FILE, d)

def complete_inbound(oid: str) -> dict | None:
    order = get_by_id(FILE, oid)
    if not order:
        return None
    if order["status"] in ("completed", "cancelled"):
        return order
    for item in order.get("items", []):
        pid = item.get("product_id")
        qty = float(item.get("quantity", 0))
        update_stock(pid, qty)
    order["status"] = "completed"
    order["updated_at"] = _ts()
    return update(FILE, oid, order)

def cancel_inbound(oid: str) -> bool:
    order = get_by_id(FILE, oid)
    if not order or order["status"] == "completed":
        return False
    order["status"] = "cancelled"
    order["updated_at"] = _ts()
    update(FILE, oid, order)
    return True
