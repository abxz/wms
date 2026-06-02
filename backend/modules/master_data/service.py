"""master_data business logic"""
from core.database import get_by_id, add, update, delete, paginate, all_

PRODUCT_SEARCH = ["name", "sku", "spec", "category", "barcode"]
SUPPLIER_SEARCH = ["name", "contact", "phone"]
EMPLOYEE_SEARCH = ["name", "employee_no", "department"]


def list_products(page=1, size=20, search=""):
    return paginate("master_products", page, size, search, search_fields=PRODUCT_SEARCH)

def get_product(pid):
    return get_by_id("master_products", pid)

def create_product(data):
    data.pop("id", None)
    data.pop("created_at", None)
    data.pop("updated_at", None)
    return add("master_products", data)

def update_product(pid, data):
    return update("master_products", pid, data)

def delete_product(pid):
    return delete("master_products", pid)


def list_suppliers(page=1, size=20, search=""):
    return paginate("master_suppliers", page, size, search, search_fields=SUPPLIER_SEARCH)

def get_supplier(sid):
    return get_by_id("master_suppliers", sid)

def create_supplier(data):
    data.pop("id", None)
    data.pop("created_at", None)
    data.pop("updated_at", None)
    return add("master_suppliers", data)

def update_supplier(sid, data):
    return update("master_suppliers", sid, data)

def delete_supplier(sid):
    return delete("master_suppliers", sid)


def list_employees(page=1, size=20, search=""):
    return paginate("master_employees", page, size, search, search_fields=EMPLOYEE_SEARCH)

def get_employee(eid):
    return get_by_id("master_employees", eid)

def create_employee(data):
    data.pop("id", None)
    data.pop("created_at", None)
    data.pop("updated_at", None)
    return add("master_employees", data)

def update_employee(eid, data):
    return update("master_employees", eid, data)

def delete_employee(eid):
    return delete("master_employees", eid)
