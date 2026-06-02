"""导入导出模块"""
from fastapi import APIRouter, UploadFile, File, Query, HTTPException
from core.database import all_, add
from core.utils import generate_id
from modules.products import service as prod_svc
from modules.employees import service as emp_svc
from modules.inventory import service as inv_svc
from modules.suppliers import service as sup_svc
from modules.warehouses import service as wh_svc

router = APIRouter(prefix="/api/import", tags=["导入导出"])

def register(app):
    app.include_router(router)

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_MIME = [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
]

def _validate_excel(file: UploadFile) -> bool:
    if file.size and file.size > MAX_FILE_SIZE:
        raise HTTPException(413, "文件超过 10MB 限制")
    if file.content_type not in ALLOWED_MIME:
        raise HTTPException(415, "仅支持 .xlsx 文件")
    return True

@router.post("/main-data")
async def import_main_data(file: UploadFile = File(...)):
    """模板A：主数据（仓库+商品+供应商+库存+发票号码）"""
    _validate_excel(file)
    try:
        import openpyxl
        wb = openpyxl.load_workbook(file.file, data_only=True)
        ws = wb.active
        rows = list(ws.iter_rows(min_row=2, values_only=True))
    except Exception as e:
        raise HTTPException(400, f"Excel 解析失败: {str(e)}")

    headers = ["仓库名称","仓库地址","商品名称","商品规格","商品条码",
               "库存预警","供应商名称","库存数量","发票号码","单位","单价"]
    
    results = {"total": len(rows), "success": 0, "errors": []}
    for i, row in enumerate(rows):
        line_no = i + 2
        try:
            wh_name, wh_addr, p_name, p_spec, p_barcode, min_stk, sup_name, inv_qty, inv_no, unit, price = (
                (str(v).strip() if v else "") for v in (row + (None,)*11)[:11]
            )
            if not wh_name or not p_name:
                results["errors"].append(f"第{line_no}行：仓库名称或商品名称为空")
                continue

            # 查找或创建仓库
            whs = wh_svc.get_all_warehouses()
            wh = next((w for w in whs if w["name"] == wh_name), None)
            if not wh:
                wh = wh_svc.create_warehouse({"name": wh_name, "address": wh_addr})
            # 查找或创建供应商
            sups = sup_svc.get_all_suppliers()
            sup = next((s for s in sups if s["name"] == sup_name), None) if sup_name else None
            if not sup and sup_name:
                sup = sup_svc.create_supplier({"name": sup_name, "contact": "", "phone": ""})
            # 创建商品
            prod = prod_svc.create_product({
                "name": p_name, "spec": p_spec, "barcode": p_barcode,
                "warehouse_id": wh["id"], "unit": unit or "个",
                "supplier_id": sup["id"] if sup else "",
                "min_stock": float(min_stk) if min_stk else 0, "price": float(price) if price else 0,
                "invoice_number": inv_no
            })
            # 初始化库存
            if inv_qty:
                try:
                    inv_svc.update_stock(prod["id"], float(inv_qty))
                except:
                    pass
            results["success"] += 1
        except Exception as e:
            results["errors"].append(f"第{line_no}行：{str(e)}")
    return results


@router.post("/employees")
async def import_employees(file: UploadFile = File(...)):
    """模板B：员工"""
    _validate_excel(file)
    try:
        import openpyxl
        wb = openpyxl.load_workbook(file.file, data_only=True)
        ws = wb.active
        rows = list(ws.iter_rows(min_row=2, values_only=True))
    except Exception as e:
        raise HTTPException(400, f"Excel 解析失败: {str(e)}")

    results = {"total": len(rows), "success": 0, "errors": []}
    for i, row in enumerate(rows):
        line_no = i + 2
        try:
            name, dept, role, quota, remark = (
                (str(v).strip() if v else "") for v in (row + (None,)*5)[:5]
            )
            if not name:
                results["errors"].append(f"第{line_no}行：姓名为空")
                continue
            role = role if role in ("super_admin", "admin", "claimer") else "claimer"
            emp_svc.create_employee({
                "name": name, "department": dept, "role": role,
                "monthly_quota": float(quota) if quota else 1000, "remark": remark
            })
            results["success"] += 1
        except Exception as e:
            results["errors"].append(f"第{line_no}行：{str(e)}")
    return results


@router.post("/orders")
async def import_orders(file: UploadFile = File(...)):
    """模板C：出入库（按日期排序，先入库后出库）"""
    _validate_excel(file)
    try:
        import openpyxl
        wb = openpyxl.load_workbook(file.file, data_only=True)
        ws = wb.active
        rows = list(ws.iter_rows(min_row=2, values_only=True))
    except Exception as e:
        raise HTTPException(400, f"Excel 解析失败: {str(e)}")

    results = {"total": len(rows), "success": 0, "errors": []}
    # 先按日期排序，入库优先
    parsed = []
    for i, row in enumerate(rows):
        typ, order_no, p_name, qty_str, operator, claimer, location, date_str = (
            (str(v).strip() if v else "") for v in (row + (None,)*8)[:8]
        )
        if typ not in ("入库", "出库"):
            results["errors"].append(f"第{i+2}行：类型必须为'入库'或'出库'")
            continue
        parsed.append({
            "line": i+2, "type": "inbound" if typ == "入库" else "outbound",
            "order_no": order_no, "product_name": p_name, "qty": qty_str,
            "operator": operator, "claimer": claimer, "location": location, "date": date_str
        })
    # 按日期排序，同天入库优先
    parsed.sort(key=lambda r: (r["date"] or "0") + ("0" if r["type"]=="inbound" else "1"))
    
    from modules.inbound import service as in_svc
    from modules.outbound import service as out_svc
    from modules.inventory import service as inv_svc

    for r in parsed:
        try:
            qty = float(r["qty"]) if r["qty"] else 0
            if qty <= 0:
                results["errors"].append(f"第{r['line']}行：数量必须大于0")
                continue
            # 查找商品
            products = prod_svc.get_all_products()
            prod = next((p for p in products if p["name"] == r["product_name"]), None)
            if not prod:
                results["errors"].append(f"第{r['line']}行：商品 '{r['product_name']}' 不存在")
                continue
            # 查找操作人
            emps = emp_svc.list_employees(search=r["operator"])
            emp = next((e for e in emps.get("items",[]) if r["operator"] in e.get("name","")), None)

            if r["type"] == "inbound":
                in_svc.create_inbound({
                    "items": [{"product_id": prod["id"], "quantity": qty, "price": 0}],
                    "supplier_name": "", "admin_name": r["operator"]
                })
            else:  # outbound
                # 检查库存
                inv = inv_svc.get_stock_by_product(prod["id"])
                cur_qty = inv.get("quantity", 0) if inv else 0
                if cur_qty < qty:
                    results["errors"].append(
                        f"第{r['line']}行：'{r['product_name']}' 库存不足（当前{cur_qty}，需要{qty}）")
                    continue
                out_svc.create_outbound({
                    "items": [{"product_id": prod["id"], "quantity": qty, "price": 0}],
                    "claimer_name": r["claimer"], "admin_name": r["operator"],
                    "usage_location": r["location"]
                })
            results["success"] += 1
        except Exception as e:
            results["errors"].append(f"第{r['line']}行：{str(e)}")
    return results


@router.get("/template/main-data")
def download_main_data_template():
    """下载主数据导入模板"""
    import openpyxl
    from io import BytesIO
    from fastapi.responses import StreamingResponse

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "主数据导入模板"
    headers = ["仓库名称","仓库地址","商品名称","商品规格","商品条码",
               "库存预警数","供应商名称","库存数量","发票号码","单位","单价"]
    ws.append(headers)
    ws.append(["主仓库","","示例轴承","6205ZZ","6901234567890","10","ABC供应商","100","INV-2026-0001","个","25"])
    
    buf = BytesIO()
    wb.save(buf)
    buf.seek(0)
    return StreamingResponse(buf, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                             headers={"Content-Disposition": "attachment; filename=main_data_template.xlsx"})


@router.get("/template/employees")
def download_employee_template():
    """下载员工导入模板"""
    import openpyxl
    from io import BytesIO
    from fastapi.responses import StreamingResponse

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "员工导入模板"
    headers = ["姓名","部门","角色","领用额度","备注"]
    ws.append(headers)
    ws.append(["张三","机加工车间","claimer","1000",""])
    
    buf = BytesIO()
    wb.save(buf)
    buf.seek(0)
    return StreamingResponse(buf, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                             headers={"Content-Disposition": "attachment; filename=employee_template.xlsx"})


@router.get("/template/orders")
def download_order_template():
    """下载出入库导入模板"""
    import openpyxl
    from io import BytesIO
    from fastapi.responses import StreamingResponse

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "出入库导入模板"
    headers = ["类型","单号","产品名称","数量","操作人","领料人","使用地点","日期"]
    ws.append(headers)
    ws.append(["入库","","轴承","100","王主管","","","2026-05-14"])
    ws.append(["出库","","轴承","10","王主管","张三","3号车间","2026-05-14"])
    
    buf = BytesIO()
    wb.save(buf)
    buf.seek(0)
    return StreamingResponse(buf, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                             headers={"Content-Disposition": "attachment; filename=order_template.xlsx"})


# ═══════════════════════════════════════════════════════════════
# 导出
# ═══════════════════════════════════════════════════════════════

def _excel_response(wb, filename: str):
    from io import BytesIO
    from fastapi.responses import StreamingResponse
    buf = BytesIO()
    wb.save(buf)
    buf.seek(0)
    return StreamingResponse(buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"})


@router.get("/export/products")
def export_products():
    import openpyxl
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "商品"
    ws.append(["ID","SKU","名称","规格","分类","单位","单价","条码","供应商ID","仓库ID","最低库存","最高库存","备注"])
    for p in prod_svc.get_all_products():
        ws.append([p.get(k,"") for k in ["id","sku","name","spec","category","unit","price","barcode","supplier_id","warehouse_id","min_stock","max_stock","remark"]])
    return _excel_response(wb, "products.xlsx")


@router.get("/export/suppliers")
def export_suppliers():
    import openpyxl
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "供应商"
    ws.append(["ID","名称","联系人","电话","地址","备注"])
    for s in sup_svc.get_all_suppliers():
        ws.append([s.get(k,"") for k in ["id","name","contact","phone","address","remark"]])
    return _excel_response(wb, "suppliers.xlsx")


@router.get("/export/employees")
def export_employees():
    import openpyxl
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "员工"
    ws.append(["ID","姓名","工号","部门","角色","月度额度","已用额度"])
    for e in emp_svc.list_employees(size=9999).get("items", []):
        ws.append([e.get(k,"") for k in ["id","name","employee_no","department","role","monthly_quota","monthly_used"]])
    return _excel_response(wb, "employees.xlsx")


@router.get("/export/inventory")
def export_inventory():
    import openpyxl
    from core.database import all_
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "库存"
    ws.append(["商品ID","商品名称","库位ID","数量","更新时间"])
    products = {p["id"]: p["name"] for p in prod_svc.get_all_products()}
    for inv in all_("inventory"):
        ws.append([inv.get("product_id",""), products.get(inv.get("product_id",""),""),
                   inv.get("location_id",""), inv.get("quantity",0), inv.get("updated_at","")])
    return _excel_response(wb, "inventory.xlsx")
