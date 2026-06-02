"""master_data CRUD API"""
from fastapi import APIRouter, Query, HTTPException
from modules.master_data import service as svc

router = APIRouter(prefix="/api/master", tags=["主数据管理"])


def register(app):
    import modules.master_data.models  # ensure models registered
    app.include_router(router)


# ── Products ──────────────────────────────────────────────────────────────────

@router.get("/products")
def list_products(page: int = Query(1, ge=1), size: int = Query(20, ge=1, le=100), search: str = ""):
    return svc.list_products(page, size, search)

@router.get("/products/{pid}")
def get_product(pid: str):
    p = svc.get_product(pid)
    if not p:
        raise HTTPException(404, "商品不存在")
    return p

@router.post("/products", status_code=201)
def create_product(body: dict):
    return svc.create_product(body)

@router.put("/products/{pid}")
def update_product(pid: str, body: dict):
    p = svc.update_product(pid, body)
    if not p:
        raise HTTPException(404, "商品不存在")
    return p

@router.delete("/products/{pid}")
def delete_product(pid: str):
    if not svc.delete_product(pid):
        raise HTTPException(404, "商品不存在")
    return {"ok": True}


# ── Suppliers ─────────────────────────────────────────────────────────────────

@router.get("/suppliers")
def list_suppliers(page: int = Query(1, ge=1), size: int = Query(20, ge=1, le=100), search: str = ""):
    return svc.list_suppliers(page, size, search)

@router.get("/suppliers/{sid}")
def get_supplier(sid: str):
    s = svc.get_supplier(sid)
    if not s:
        raise HTTPException(404, "供应商不存在")
    return s

@router.post("/suppliers", status_code=201)
def create_supplier(body: dict):
    return svc.create_supplier(body)

@router.put("/suppliers/{sid}")
def update_supplier(sid: str, body: dict):
    s = svc.update_supplier(sid, body)
    if not s:
        raise HTTPException(404, "供应商不存在")
    return s

@router.delete("/suppliers/{sid}")
def delete_supplier(sid: str):
    if not svc.delete_supplier(sid):
        raise HTTPException(404, "供应商不存在")
    return {"ok": True}


# ── Employees ─────────────────────────────────────────────────────────────────

@router.get("/employees")
def list_employees(page: int = Query(1, ge=1), size: int = Query(20, ge=1, le=100), search: str = ""):
    return svc.list_employees(page, size, search)

@router.get("/employees/{eid}")
def get_employee(eid: str):
    e = svc.get_employee(eid)
    if not e:
        raise HTTPException(404, "员工不存在")
    return e

@router.post("/employees", status_code=201)
def create_employee(body: dict):
    return svc.create_employee(body)

@router.put("/employees/{eid}")
def update_employee(eid: str, body: dict):
    e = svc.update_employee(eid, body)
    if not e:
        raise HTTPException(404, "员工不存在")
    return e

@router.delete("/employees/{eid}")
def delete_employee(eid: str):
    if not svc.delete_employee(eid):
        raise HTTPException(404, "员工不存在")
    return {"ok": True}
