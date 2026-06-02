"""出库业务逻辑"""
from core.database import all_, get_by_id, add, update, paginate, atomic_check_and_deduct
from modules.outbound.model import OutboundOrder
from core.utils import generate_id, generate_order_no
from datetime import datetime

OUTFILE = "outbound"
INVFILE = "inventory"
SEARCH_FIELDS = ["order_no", "type", "status"]

def _ts():
    return datetime.now().isoformat(timespec="seconds")

def list_outbound(page=1, size=20, search=""):
    return paginate(OUTFILE, page, size, search, search_fields=SEARCH_FIELDS)

def get_outbound(oid: str):
    return get_by_id(OUTFILE, oid)

def create_outbound(data: dict) -> dict:
    order = OutboundOrder(**data)
    order.id = generate_id()
    order.order_no = generate_order_no("OUT")
    if order.items:
        order.total_amount = sum(
            float(i.get("price", 0)) * float(i.get("quantity", 0))
            for i in order.items
        )
    d = order.model_dump()
    d.pop("created_at", None)
    d.pop("updated_at", None)
    return add(OUTFILE, d)

def complete_outbound(oid: str) -> dict | None:
    """完成出库：原子检查库存并扣减（防超卖）"""
    order = get_by_id(OUTFILE, oid)
    if not order:
        return None
    if order["status"] == "completed":
        return order
    if order["status"] == "cancelled":
        return None
    # 逐项原子扣减库存
    for item in order.get("items", []):
        pid = item.get("product_id")
        qty = float(item.get("quantity", 0))
        success = atomic_check_and_deduct(INVFILE, pid, qty)
        if not success:
            # 回滚已扣减项
            for rb in order.get("items", []):
                rpid = rb.get("product_id")
                rqty = float(rb.get("quantity", 0))
                if rpid == pid:
                    break  # 失败项之前的不用回滚
                from modules.inventory.service import update_stock
                update_stock(rpid, rqty)
            raise ValueError(f"商品 {pid} 库存不足，出库完成失败")
    order["status"] = "completed"
    order["updated_at"] = _ts()
    return update(OUTFILE, oid, order)
