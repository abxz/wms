"""员工管理模块"""
from fastapi import APIRouter, Query, HTTPException
from modules.employees import service as svc

router = APIRouter(prefix="/api/employees", tags=["员工管理"])

def register(app):
    app.include_router(router)

@router.get("")
def route_list(page: int = Query(1, ge=1), size: int = Query(20, ge=1, le=100), search: str = ""):
    return svc.list_employees(page, size, search)


@router.get("/next-no")
def route_next_no(position: str = Query("", description="岗位")):
    """预览指定岗位的下一个员工编号"""
    return {"employee_no": svc.generate_employee_no(position)}

@router.get("/{eid}")
def route_get(eid: str):
    emp = svc.get_employee(eid)
    if not emp:
        raise HTTPException(404, "员工不存在")
    return emp

@router.post("", status_code=201)
def route_create(body: dict):
    return svc.create_employee(body)

@router.put("/{eid}")
def route_update(eid: str, body: dict):
    emp = svc.update_employee(eid, body)
    if not emp:
        raise HTTPException(404, "员工不存在")
    return emp

@router.delete("/{eid}")
def route_delete(eid: str):
    if not svc.delete_employee(eid):
        raise HTTPException(404, "员工不存在")
    return {"ok": True}

@router.post("/{eid}/reset-quota")
def route_reset_quota(eid: str):
    emp = svc.reset_quota(eid)
    if not emp:
        raise HTTPException(404, "员工不存在")
    return emp

@router.get("/{eid}/claims")
def route_claims(eid: str):
    if not svc.get_employee(eid):
        raise HTTPException(404, "员工不存在")
    return svc.get_claims(eid)

@router.post("/claim")
def route_claim(body: dict):
    """员工扫码领用"""
    eid = body.get("employee_id")
    pid = body.get("product_id")
    qty = float(body.get("quantity", 1))

    emp = svc.get_employee(eid)
    if not emp:
        raise HTTPException(404, "员工不存在")

    from modules.products.service import get_product
    product = get_product(pid)
    if not product:
        raise HTTPException(404, "商品不存在")

    amount = qty * product.get("price", 0)
    if emp["monthly_used"] + amount > emp["monthly_quota"]:
        raise HTTPException(400, f"月度额度不足：已用{emp['monthly_used']:.0f}，额度{emp['monthly_quota']:.0f}")

    from modules.inventory.service import update_stock
    update_stock(pid, -qty)
    svc.update_employee(eid, {"monthly_used": emp["monthly_used"] + amount})
    record = svc.add_claim({
        "employee_id": eid,
        "product_id": pid,
        "product_name": product.get("name", ""),
        "quantity": qty,
        "amount": amount,
        "remark": body.get("remark", ""),
    })
    return record


@router.get("/{eid}/qrcode")
def route_qrcode(eid: str):
    """生成员工二维码（内容：姓名+编号+部门），返回 PNG 图片"""
    emp = svc.get_employee(eid)
    if not emp:
        raise HTTPException(404, "员工不存在")

    name = emp.get("name", "")
    emp_no = emp.get("employee_no", "")
    dept = emp.get("department", "")

    # 二维码内容：姓名 | 编号 | 部门
    qr_text = f"{name}|{emp_no}|{dept}"

    import io
    import qrcode
    from fastapi.responses import Response
    from urllib.parse import quote

    qr = qrcode.QRCode(version=None, error_correction=qrcode.constants.ERROR_CORRECT_M,
                        box_size=10, border=4)
    qr.add_data(qr_text)
    qr.make(fit=True)
    img = qr.make_image()
    buf = io.BytesIO()
    img.save(buf, format="PNG")

    # 文件名用员工姓名
    safe_name = quote(name, safe='')[:50] if name else emp_no
    return Response(
        content=buf.getvalue(),
        media_type="image/png",
        headers={
            "Content-Disposition": f'attachment; filename*=UTF-8\'\'{safe_name}.png',
            "Access-Control-Expose-Headers": "Content-Disposition",
        },
    )
