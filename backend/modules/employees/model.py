"""员工数据模型"""
from pydantic import BaseModel
from typing import Optional

class Employee(BaseModel):
    id: str = ""
    name: str
    employee_no: str = ""
    department: str = ""
    role: str = "claimer"           # super_admin | admin | claimer（新加）
    qr_code: str = ""               # QR-EMP-{id}
    qr_image_path: str = ""         # 二维码图片路径（新加）
    monthly_quota: float = 1000
    monthly_used: float = 0
    active: bool = True
    created_at: str = ""
    updated_at: str = ""

class ClaimRecord(BaseModel):
    id: str = ""
    employee_id: str
    product_id: str
    product_name: str = ""
    quantity: float
    amount: float = 0
    date: str = ""
    remark: str = ""
