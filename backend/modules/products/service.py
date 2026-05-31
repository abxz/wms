"""商品业务逻辑"""
from core.database import all_, get_by_id, add, update, delete, paginate
from modules.products.model import Product
from core.utils import generate_id
from uuid import uuid4

FILE = "products.json"
SEARCH_FIELDS = ["name", "sku", "barcode", "category", "spec", "invoice_number"]

def list_products(page=1, size=20, search=""):
    return paginate(FILE, page, size, search, search_fields=SEARCH_FIELDS)

def get_product(pid: str):
    return get_by_id(FILE, pid)

def create_product(data: dict) -> dict:
    p = Product(**data)
    p.id = generate_id()
    if not p.qr_uuid:
        p.qr_uuid = uuid4().hex[:12]            # 永久二维码UUID
    d = p.model_dump()
    d.pop("created_at", None)
    d.pop("updated_at", None)
    return add(FILE, d)

def update_product(pid: str, data: dict) -> dict | None:
    return update(FILE, pid, data)

def delete_product(pid: str) -> bool:
    return delete(FILE, pid)

def get_all_products() -> list[dict]:
    return all_(FILE)

def get_by_qr_uuid(qr_uuid: str) -> dict | None:
    """扫码时按 QR 永久 UUID 查找商品"""
    for p in all_(FILE):
        if p.get("qr_uuid") == qr_uuid:
            return p
    return None
