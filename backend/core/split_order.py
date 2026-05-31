"""拆单逻辑 —— 出入库单超限自动拆分为多单"""
from typing import Optional
from core.database import get_by_id
from core.utils import generate_order_no


def split_order_items(items: list[dict], max_items: int = 7, prefix: str = "OUT") -> list[dict]:
    """将商品列表按最大行数拆分为多单数据
    
    Args:
        items: 商品列表 [{"product_id":"...", "quantity":2, ...}, ...]
        max_items: 每单最大行数（默认 7）
        prefix: 单号前缀（IN / OUT）
    
    Returns:
        [{"order_no": "OUT-0001", "items": [...]}, {"order_no": "OUT-0002", "items": [...]}]
    """
    if not items:
        return []
    
    chunks = []
    for i in range(0, len(items), max_items):
        chunk = items[i:i + max_items]
        chunks.append({
            "order_no": generate_order_no(prefix),
            "items": chunk,
        })
    return chunks


def batch_submit_orders(orders: list[dict], order_type: str = "outbound",
                        shared_fields: Optional[dict] = None) -> list[dict]:
    """整批提交所有子单（全部校验→全部执行→全部保存）
    
    Args:
        orders: split_order_items 的输出
        order_type: "inbound" | "outbound"
        shared_fields: 所有子单共享的字段（admin_name, claimer_name, usage_location 等）
    
    Returns:
        [{"order_no": "OUT-0001", "status": "success", "result": {...}}, ...]
    """
    results = []
    # 统一校验阶段
    for order in orders:
        # 校验库存（出库时）
        if order_type == "outbound":
            from modules.inventory.service import get_inventory_by_product
            for item in order["items"]:
                pid = item.get("product_id")
                qty = float(item.get("quantity", 0))
                inv = get_inventory_by_product(pid)
                cur = inv.get("quantity", 0) if inv else 0
                if cur < qty:
                    results.append({
                        "order_no": order["order_no"],
                        "status": "stock_shortage",
                        "message": f"商品 {pid} 库存不足（当前{cur}，需要{qty}）"
                    })
                    return results  # 任一校验失败 → 全部不提交

    # 全部校验通过 → 全部执行
    for order in orders:
        try:
            data = {"items": order["items"]}
            if shared_fields:
                data.update(shared_fields)
            
            if order_type == "inbound":
                from modules.inbound import service as in_svc
                # 手动设单号（不走自动生成，用拆分好的）
                from modules.inbound.model import InboundOrder
                from core.utils import generate_id
                from datetime import datetime
                
                obj = InboundOrder(**data)
                obj.id = generate_id()
                obj.order_no = order["order_no"]
                obj.created_at = datetime.now().isoformat(timespec="seconds")
                obj.updated_at = obj.created_at
                
                from core.database import add
                result = add("inbound.json", obj.model_dump())
                
                # 自动完成入库
                from modules.inbound.service import complete_inbound
                try:
                    complete_inbound(obj.id)
                except:
                    pass
                results.append({"order_no": order["order_no"], "status": "success", "result": result})
            
            else:  # outbound
                from modules.outbound import service as out_svc
                from modules.outbound.model import OutboundOrder
                from core.utils import generate_id
                from datetime import datetime
                
                obj = OutboundOrder(**data)
                obj.id = generate_id()
                obj.order_no = order["order_no"]
                obj.created_at = datetime.now().isoformat(timespec="seconds")
                obj.updated_at = obj.created_at
                
                from core.database import add
                result = add("outbound.json", obj.model_dump())
                
                # 自动完成出库
                from modules.outbound.service import complete_outbound
                try:
                    complete_outbound(obj.id)
                except ValueError as e:
                    results.append({"order_no": order["order_no"], "status": "failed", "message": str(e)})
                    continue
                results.append({"order_no": order["order_no"], "status": "success", "result": result})
        
        except Exception as e:
            results.append({"order_no": order["order_no"], "status": "error", "message": str(e)})
    
    return results
