"""master_data schema ORM models"""
from sqlalchemy import Column, String, Float, Boolean, Text
from core.database import Base, _TABLE_MODEL


class MasterProduct(Base):
    __tablename__ = "master_products"
    __table_args__ = {"schema": "master_data"}
    id = Column(String(32), primary_key=True)
    name = Column(String(256), nullable=False)
    sku = Column(String(64), default="")
    spec = Column(String(128), default="")
    unit = Column(String(16), default="个")
    category = Column(String(64), default="")
    barcode = Column(String(64), default="")
    price = Column(Float, default=0)
    min_stock = Column(Float, default=0)
    max_stock = Column(Float, default=999999)
    warehouse_id = Column(String(32), default="")
    location_id = Column(String(32), default="")
    supplier_id = Column(String(32), default="")
    active = Column(Boolean, default=True)
    remark = Column(Text, default="")
    created_at = Column(String(32), default="")
    updated_at = Column(String(32), default="")


class MasterSupplier(Base):
    __tablename__ = "master_suppliers"
    __table_args__ = {"schema": "master_data"}
    id = Column(String(32), primary_key=True)
    name = Column(String(256), nullable=False)
    contact = Column(String(64), default="")
    phone = Column(String(32), default="")
    address = Column(Text, default="")
    tax_no = Column(String(64), default="")
    bank_name = Column(String(128), default="")
    bank_account = Column(String(64), default="")
    remark = Column(Text, default="")
    active = Column(Boolean, default=True)
    created_at = Column(String(32), default="")
    updated_at = Column(String(32), default="")


class MasterEmployee(Base):
    __tablename__ = "master_employees"
    __table_args__ = {"schema": "master_data"}
    id = Column(String(32), primary_key=True)
    name = Column(String(128), nullable=False)
    employee_no = Column(String(32), default="")
    department = Column(String(64), default="")
    phone = Column(String(32), default="")
    email = Column(String(128), default="")
    monthly_quota = Column(Float, default=1000)
    monthly_used = Column(Float, default=0)
    active = Column(Boolean, default=True)
    created_at = Column(String(32), default="")
    updated_at = Column(String(32), default="")


_TABLE_MODEL.update({
    "master_products": MasterProduct,
    "master_suppliers": MasterSupplier,
    "master_employees": MasterEmployee,
})
