"""入库单数据模型"""
from pydantic import BaseModel
from typing import Optional
from core.schema import OrderItemSchema

class InboundOrder(BaseModel):
    id: str = ""
    order_no: str = ""              # IN-0001
    invoice_no: str = ""            # 发票号码（新加）
    items: list[dict] = []
    supplier_id: str = ""
    supplier_name: str = ""         # 供应商名称（新加）
    admin_id: str = ""              # 管理员ID（新加）
    admin_name: str = ""            # 管理员姓名（新加）
    total_amount: float = 0
    status: str = "pending"
    max_items: int = 7              # 此单上限（新加）
    remark: str = ""
    purchase_type: str = ""         # 采购类型：零星采购/合同采购
    contract_no: str = ""           # 采购编号
    created_at: str = ""
    updated_at: str = ""
