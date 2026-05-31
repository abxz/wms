"""供应商数据模型"""
from pydantic import BaseModel
from typing import Optional

class Supplier(BaseModel):
    id: str = ""
    name: str
    contact: str = ""
    phone: str = ""
    address: str = ""
    remark: str = ""
    active: bool = True
    created_at: str = ""
    updated_at: str = ""
