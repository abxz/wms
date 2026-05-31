"""商品请求/响应Schema"""
from pydantic import BaseModel
from typing import Optional

class ProductCreate(BaseModel):
    sku: str = ""
    name: str
    category: str = ""
    unit: str = "个"
    price: float = 0
    barcode: str = ""
    supplier_id: str = ""
    location_id: str = ""
    warehouse_id: str = ""
    min_stock: float = 0
    max_stock: float = 999999
    remark: str = ""
    active: bool = True

class ProductUpdate(BaseModel):
    sku: Optional[str] = None
    name: Optional[str] = None
    category: Optional[str] = None
    unit: Optional[str] = None
    price: Optional[float] = None
    barcode: Optional[str] = None
    supplier_id: Optional[str] = None
    location_id: Optional[str] = None
    warehouse_id: Optional[str] = None
    min_stock: Optional[float] = None
    max_stock: Optional[float] = None
    remark: Optional[str] = None
    active: Optional[bool] = None
