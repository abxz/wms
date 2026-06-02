"""库存数据模型"""
from pydantic import BaseModel
from typing import Optional

class Inventory(BaseModel):
    id: str = ""
    product_id: str
    quantity: float = 0
    location_id: str = ""
    min_stock: float = 0
    max_stock: float = 999999
    updated_at: str = ""
