"""出库单数据模型"""
from pydantic import BaseModel
from typing import Optional
from core.schema import OrderItemSchema

class OutboundOrder(BaseModel):
    id: str = ""
    order_no: str = ""              # OUT-0001
    invoice_no: str = ""            # 发票号码（新加）
    items: list[dict] = []
    type: str = "normal"
    employee_id: str = ""
    claimer_id: str = ""            # 领料人ID（新加）
    claimer_name: str = ""          # 领料人姓名（新加）
    admin_id: str = ""              # 管理员ID（新加）
    admin_name: str = ""            # 管理员姓名（新加）
    usage_location: str = ""        # 使用地点（新加）
    total_amount: float = 0
    status: str = "pending"
    max_items: int = 7              # 此单上限（新加）
    remark: str = ""
    created_at: str = ""
    updated_at: str = ""
