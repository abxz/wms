"""商品数据模型"""
from pydantic import BaseModel
from typing import Optional

class Product(BaseModel):
    id: str = ""
    sku: str = ""
    spec: str = ""                  # 规格（新加）
    name: str
    category: str = ""
    unit: str = "个"
    price: float = 0
    barcode: str = ""
    qr_uuid: str = ""               # 永久二维码ID（新加）
    supplier_id: str = ""
    location_id: str = ""
    warehouse_id: str = ""
    min_stock: float = 0
    max_stock: float = 999999
    invoice_number: str = ""        # 发票号码（新加）
    remark: str = ""
    active: bool = True
    created_at: str = ""
    updated_at: str = ""
