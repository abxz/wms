"""库位业务逻辑"""
from core.database import all_, get_by_id, add, update, delete, paginate
from modules.locations.model import Location
from core.utils import generate_id

FILE = "locations"
SEARCH_FIELDS = ["code", "area", "description"]

def list_locations(page=1, size=20, search=""):
    return paginate(FILE, page, size, search, search_fields=SEARCH_FIELDS)

def get_location(lid: str):
    return get_by_id(FILE, lid)

def create_location(data: dict) -> dict:
    loc = Location(**data)
    loc.id = generate_id()
    d = loc.model_dump()
    d.pop("created_at", None)
    d.pop("updated_at", None)
    return add(FILE, d)

def update_location(lid: str, data: dict) -> dict | None:
    return update(FILE, lid, data)

def delete_location(lid: str) -> bool:
    return delete(FILE, lid)

def get_all_locations() -> list[dict]:
    return all_(FILE)
