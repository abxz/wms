"""全局 Schema"""
from pydantic import BaseModel
from typing import Optional

class OrderItemSchema(BaseModel):
    product_id: str
    quantity: float
    price: float = 0
