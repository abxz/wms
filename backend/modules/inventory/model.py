"""库存数据模型"""
from pydantic import BaseModel
from typing import Optional

class Inventory(BaseModel):
    id: str = ""
    product_id: str
    quantity: float = 0
    location_id: str = ""
    updated_at: str = ""
