"""发票数据模型 — 增强版（支持解析引擎全部字段）"""
from pydantic import BaseModel
from typing import Optional


class Invoice(BaseModel):
    id: str = ""
    invoice_number: str = ""          # 发票号码
    invoice_code: str = ""            # 发票代码
    invoice_type: str = ""            # 数电票/专票/普票
    issue_date: str = ""              # 开票日期
    total_amount: float = 0           # 价税合计
    tax_amount: float = 0             # 税额
    seller_name: str = ""             # 销售方名称
    seller_tax_no: str = ""           # 销方税号
    buyer_name: str = ""              # 购买方名称
    buyer_tax_no: str = ""            # 购方税号
    file_path: str = ""               # 原文件路径
    file_hash: str = ""               # SHA256
    source: str = "manual"            # upload/email/feishu/batch
    status: str = "pending"           # pending/reconciled/duplicate
    confidence: int = 0               # 解析置信度 0-100
    wms_inbound_id: str = ""          # 关联WMS入库单ID
    supplier_id: str = ""             # 关联供应商ID
    remark: str = ""
    created_at: str = ""
    updated_at: str = ""
