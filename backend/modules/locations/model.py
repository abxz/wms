"""库位数据模型"""
from pydantic import BaseModel
from typing import Optional

class Location(BaseModel):
    id: str = ""
    code: str
    area: str = ""
    description: str = ""
    active: bool = True
    created_at: str = ""
    updated_at: str = ""
