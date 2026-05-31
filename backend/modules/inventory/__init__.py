"""库存管理模块"""
from fastapi import APIRouter, Query, HTTPException
from modules.inventory import service as svc

router = APIRouter(prefix="/api/inventory", tags=["库存管理"])

def register(app):
    app.include_router(router)

@router.get("")
def route_list():
    return svc.get_all_inventory()

@router.get("/alerts")
def route_alerts(threshold: float = Query(10, ge=0)):
    return svc.get_alerts(threshold)

@router.get("/by-product/{pid}")
def route_by_product(pid: str):
    inv = svc.get_inventory_by_product(pid)
    if not inv:
        return {"product_id": pid, "quantity": 0}
    return inv

@router.get("/by-location/{lid}")
def route_by_location(lid: str):
    return svc.get_inventory_by_location(lid)

@router.post("/adjust")
def route_adjust(body: dict):
    return svc.adjust_inventory(body.get("product_id"), body.get("location_id", ""), float(body.get("quantity", 0)))
