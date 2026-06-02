"""商品管理模块"""
from fastapi import APIRouter, Query, HTTPException
from modules.products import service as svc

router = APIRouter(prefix="/api/products", tags=["商品管理"])


def register(app):
    app.include_router(router)


@router.get("")
def route_list(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    search: str = "",
    warehouse_id: str = Query("", description="按仓库ID筛选"),
):
    return svc.list_products(page, size, search, warehouse_id=warehouse_id)


@router.get("/next-sku")
def route_next_sku(
    category: str = Query("", description="商品分类"),
    name: str = Query("", description="商品名称"),
):
    """预览指定分类+名称的下一个 SKU"""
    return {"sku": svc.generate_sku(category, name)}


@router.get("/{pid}")
def route_get(pid: str):
    p = svc.get_product(pid)
    if not p:
        raise HTTPException(404, "商品不存在")
    return p


@router.post("", status_code=201)
def route_create(body: dict):
    return svc.create_product(body)


@router.put("/{pid}")
def route_update(pid: str, body: dict):
    p = svc.update_product(pid, body)
    if not p:
        raise HTTPException(404, "商品不存在")
    return p


@router.delete("/{pid}")
def route_delete(pid: str):
    if not svc.delete_product(pid):
        raise HTTPException(404, "商品不存在")
    return {"ok": True}


@router.get("/{pid}/invoice")
def route_product_invoice(pid: str):
    from core.database import all_
    p = svc.get_product(pid)
    if not p:
        raise HTTPException(404, "商品不存在")
    inv_number = p.get("invoice_number", "")
    if not inv_number:
        return {"invoice": None, "siblings": []}
    invoice = next((i for i in all_("invoices") if i.get("invoice_number") == inv_number), None)
    siblings = [x for x in svc.get_all_products() if x.get("invoice_number") == inv_number and x["id"] != pid]
    return {"invoice": invoice, "siblings": siblings}
