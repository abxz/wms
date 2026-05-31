"""数据面板模块"""
from fastapi import APIRouter
from core.database import all_
from modules.products.service import get_all_products
from modules.inventory.service import get_all_inventory
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/dashboard", tags=["数据面板"])

def register(app):
    app.include_router(router)

def _in_date_range(items, days):
    now = datetime.now()
    start = now - timedelta(days=days)
    cutoff = start.isoformat()
    count = 0
    for item in items:
        ts = item.get("created_at", "")
        if ts and ts >= cutoff:
            count += 1
    return count

@router.get("/summary")
def summary():
    """总览数据"""
    products = get_all_products()
    inventory = get_all_inventory()
    inbound = all_("inbound.json")
    outbound = all_("outbound.json")
    invoices = all_("invoices.json")
    employees = all_("employees.json")
    
    total_stock = sum(i.get("quantity", 0) for i in inventory)
    alerts = [i for i in inventory if i.get("quantity", 0) <= 10]
    
    return {
        "total_products": len(products),
        "total_stock": total_stock,
        "alert_count": len(alerts),
        "inbound_today": _in_date_range(inbound, 1),
        "outbound_today": _in_date_range(outbound, 1),
        "pending_inbound": len([o for o in inbound if o.get("status") == "pending"]),
        "pending_outbound": len([o for o in outbound if o.get("status") == "pending"]),
        "total_invoices": len(invoices),
        "total_employees": len(employees),
        "total_suppliers": len(all_("suppliers.json")),
        "total_locations": len(all_("locations.json")),
        # 发票增强统计
        "invoice_today": _in_date_range(invoices, 1),
        "invoice_matched": sum(1 for i in invoices if i.get("status") == "reconciled"),
    }

@router.get("/trends")
def trends(days: int = 30):
    """月度趋势"""
    inbound = all_("inbound.json")
    outbound = all_("outbound.json")
    
    now = datetime.now()
    cutoff = (now - timedelta(days=days)).isoformat()
    
    inbound_count = _in_date_range(inbound, days)
    outbound_count = _in_date_range(outbound, days)
    
    return {
        "days": days,
        "inbound_count": inbound_count,
        "outbound_count": outbound_count,
        "inbound_amount": sum(o.get("total_amount", 0) for o in inbound if o.get("created_at", "") >= cutoff),
        "outbound_amount": sum(o.get("total_amount", 0) for o in outbound if o.get("created_at", "") >= cutoff),
    }
