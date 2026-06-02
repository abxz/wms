"""SQLAlchemy ORM models — registers into core.database._TABLE_MODEL"""
from sqlalchemy import Column, String, Float, Boolean, Integer, Text, JSON
from core.database import Base, _TABLE_MODEL


class Product(Base):
    __tablename__ = "products"
    id = Column(String(32), primary_key=True)
    sku = Column(String(64), default="")
    spec = Column(String(128), default="")
    name = Column(String(256), nullable=False)
    category = Column(String(64), default="")
    unit = Column(String(16), default="个")
    price = Column(Float, default=0)
    barcode = Column(String(64), default="")
    qr_uuid = Column(String(32), default="")
    supplier_id = Column(String(32), default="")
    location_id = Column(String(32), default="")
    warehouse_id = Column(String(32), default="")
    min_stock = Column(Float, default=0)
    max_stock = Column(Float, default=999999)
    invoice_number = Column(String(64), default="")
    remark = Column(Text, default="")
    active = Column(Boolean, default=True)
    created_at = Column(String(32), default="")
    updated_at = Column(String(32), default="")


class Location(Base):
    __tablename__ = "locations"
    id = Column(String(32), primary_key=True)
    code = Column(String(64), nullable=False)
    name = Column(String(128), default="")
    area = Column(String(64), default="")
    warehouse_id = Column(String(32), default="")
    zone = Column(String(32), default="")
    description = Column(Text, default="")
    active = Column(Boolean, default=True)
    created_at = Column(String(32), default="")
    updated_at = Column(String(32), default="")


class Supplier(Base):
    __tablename__ = "suppliers"
    id = Column(String(32), primary_key=True)
    name = Column(String(256), nullable=False)
    contact = Column(String(64), default="")
    phone = Column(String(32), default="")
    address = Column(Text, default="")
    remark = Column(Text, default="")
    active = Column(Boolean, default=True)
    created_at = Column(String(32), default="")
    updated_at = Column(String(32), default="")


class Employee(Base):
    __tablename__ = "employees"
    id = Column(String(32), primary_key=True)
    name = Column(String(128), nullable=False)
    employee_no = Column(String(32), default="")
    department = Column(String(64), default="")
    role = Column(String(32), default="claimer")
    qr_code = Column(String(64), default="")
    qr_image_path = Column(String(256), default="")
    monthly_quota = Column(Float, default=1000)
    monthly_used = Column(Float, default=0)
    active = Column(Boolean, default=True)
    created_at = Column(String(32), default="")
    updated_at = Column(String(32), default="")


class ClaimRecord(Base):
    __tablename__ = "claims"
    id = Column(String(32), primary_key=True)
    employee_id = Column(String(32), nullable=False)
    product_id = Column(String(32), nullable=False)
    product_name = Column(String(256), default="")
    quantity = Column(Float, nullable=False)
    amount = Column(Float, default=0)
    date = Column(String(32), default="")
    remark = Column(Text, default="")


class Inventory(Base):
    __tablename__ = "inventory"
    id = Column(String(32), primary_key=True)
    product_id = Column(String(32), nullable=False)
    quantity = Column(Float, default=0)
    location_id = Column(String(32), default="")
    created_at = Column(String(32), default="")
    updated_at = Column(String(32), default="")


class InboundOrder(Base):
    __tablename__ = "inbound"
    id = Column(String(32), primary_key=True)
    order_no = Column(String(32), default="")
    invoice_no = Column(String(64), default="")
    items = Column(JSON, default=list)
    supplier_id = Column(String(32), default="")
    supplier_name = Column(String(256), default="")
    admin_id = Column(String(32), default="")
    admin_name = Column(String(128), default="")
    total_amount = Column(Float, default=0)
    status = Column(String(32), default="pending")
    max_items = Column(Integer, default=7)
    remark = Column(Text, default="")
    created_at = Column(String(32), default="")
    updated_at = Column(String(32), default="")


class OutboundOrder(Base):
    __tablename__ = "outbound"
    id = Column(String(32), primary_key=True)
    order_no = Column(String(32), default="")
    invoice_no = Column(String(64), default="")
    items = Column(JSON, default=list)
    type = Column(String(32), default="normal")
    employee_id = Column(String(32), default="")
    claimer_id = Column(String(32), default="")
    claimer_name = Column(String(128), default="")
    admin_id = Column(String(32), default="")
    admin_name = Column(String(128), default="")
    usage_location = Column(String(256), default="")
    total_amount = Column(Float, default=0)
    status = Column(String(32), default="pending")
    max_items = Column(Integer, default=7)
    remark = Column(Text, default="")
    created_at = Column(String(32), default="")
    updated_at = Column(String(32), default="")


class Invoice(Base):
    __tablename__ = "invoices"
    id = Column(String(32), primary_key=True)
    invoice_number = Column(String(64), default="")
    invoice_code = Column(String(64), default="")
    invoice_type = Column(String(32), default="")
    issue_date = Column(String(16), default="")
    total_amount = Column(Float, default=0)
    tax_amount = Column(Float, default=0)
    seller_name = Column(String(256), default="")
    seller_tax_no = Column(String(64), default="")
    buyer_name = Column(String(256), default="")
    buyer_tax_no = Column(String(64), default="")
    file_path = Column(String(512), default="")
    file_hash = Column(String(64), default="")
    source = Column(String(32), default="manual")
    status = Column(String(32), default="pending")
    confidence = Column(Integer, default=0)
    wms_inbound_id = Column(String(32), default="")
    supplier_id = Column(String(32), default="")
    remark = Column(Text, default="")
    created_at = Column(String(32), default="")
    updated_at = Column(String(32), default="")


class Warehouse(Base):
    __tablename__ = "warehouses"
    id = Column(String(32), primary_key=True)
    name = Column(String(256), nullable=False)
    code = Column(String(32), default="")
    address = Column(Text, default="")
    contact = Column(String(64), default="")
    phone = Column(String(32), default="")
    capacity = Column(Integer, default=0)
    status = Column(String(32), default="active")
    active = Column(Boolean, default=True)
    remark = Column(Text, default="")
    created_at = Column(String(32), default="")
    updated_at = Column(String(32), default="")


class StockMutation(Base):
    __tablename__ = "stock_mutations"
    id = Column(String(32), primary_key=True)
    product_id = Column(String(32), nullable=False)
    location_id = Column(String(32), default="")
    delta = Column(Float, nullable=False)
    type = Column(String(32), default="")
    ref_id = Column(String(32), default="")
    remark = Column(Text, default="")
    created_at = Column(String(32), default="")
    updated_at = Column(String(32), default="")


class SystemConfig(Base):
    __tablename__ = "system_config"
    id = Column(String(32), primary_key=True)
    key = Column(String(64), nullable=False, unique=True)
    value = Column(Text, default="")
    created_at = Column(String(32), default="")
    updated_at = Column(String(32), default="")


# Register all models
_TABLE_MODEL.update({
    "products": Product,
    "locations": Location,
    "suppliers": Supplier,
    "employees": Employee,
    "claims": ClaimRecord,
    "inventory": Inventory,
    "inbound": InboundOrder,
    "outbound": OutboundOrder,
    "invoices": Invoice,
    "warehouses": Warehouse,
    "stock_mutations": StockMutation,
    "system_config": SystemConfig,
    # legacy JSON filenames → same models
    "products.json": Product,
    "locations.json": Location,
    "suppliers.json": Supplier,
    "employees.json": Employee,
    "claims.json": ClaimRecord,
    "inventory.json": Inventory,
    "inbound.json": InboundOrder,
    "outbound.json": OutboundOrder,
    "invoices.json": Invoice,
    "warehouses.json": Warehouse,
    "stock_mutations.json": StockMutation,
    "system_config.json": SystemConfig,
})
