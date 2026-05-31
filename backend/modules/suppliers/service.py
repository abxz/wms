"""供应商业务逻辑"""
from core.database import all_, get_by_id, add, update, delete, paginate
from modules.suppliers.model import Supplier
from core.utils import generate_id

FILE = "suppliers.json"
SEARCH_FIELDS = ["name", "contact", "phone"]

def list_suppliers(page=1, size=20, search=""):
    return paginate(FILE, page, size, search, search_fields=SEARCH_FIELDS)

def get_supplier(sid: str):
    return get_by_id(FILE, sid)

def create_supplier(data: dict) -> dict:
    s = Supplier(**data)
    s.id = generate_id()
    d = s.model_dump()
    d.pop("created_at", None)
    d.pop("updated_at", None)
    return add(FILE, d)

def update_supplier(sid: str, data: dict) -> dict | None:
    return update(FILE, sid, data)

def delete_supplier(sid: str) -> bool:
    return delete(FILE, sid)

def get_all_suppliers() -> list[dict]:
    return all_(FILE)
