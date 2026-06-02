"""发票管理模块 — 增强版（CRUD + 解析链 + 采集 + 分类 + 对账）"""
from fastapi import APIRouter, UploadFile, File, Query, HTTPException
from modules.invoices import service as svc

router = APIRouter(prefix="/api/invoices", tags=["发票管理"])


def register(app):
    app.include_router(router)


# ═══════════════════════════════════════════════════════════════
# 基础CRUD
# ═══════════════════════════════════════════════════════════════

@router.get("")
def route_list(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    search: str = "",
    status: str = "",
):
    return svc.list_invoices(page, size, search, status)


# 统计路由必须在 /{iid} 之前，否则 "stats" 会被当作 iid
@router.get("/stats/summary")
def route_invoice_stats():
    return svc.get_invoice_stats()


@router.get("/{iid}")
def route_get(iid: str):
    inv = svc.get_invoice(iid)
    if not inv:
        raise HTTPException(404, "发票不存在")
    return inv


@router.post("", status_code=201)
def route_create(body: dict):
    return svc.create_invoice(body)


@router.put("/{iid}")
def route_update(iid: str, body: dict):
    inv = svc.update_invoice(iid, body)
    if not inv:
        raise HTTPException(404, "发票不存在")
    return inv


@router.delete("/{iid}")
def route_delete(iid: str):
    if not svc.delete_invoice(iid):
        raise HTTPException(404, "发票不存在")
    return {"ok": True}


# ═══════════════════════════════════════════════════════════════
# 文件上传
# ═══════════════════════════════════════════════════════════════

@router.post("/upload")
async def route_upload(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(400, "文件名为空")
    contents = await file.read()
    result = svc.handle_upload(contents, file.filename, file.content_type or "")
    if "error" in result:
        raise HTTPException(400, result["error"])
    return result


@router.post("/upload/batch")
async def route_batch_upload(files: list[UploadFile] = File(...)):
    results = []
    for f in files:
        try:
            contents = await f.read()
            result = svc.handle_upload(contents, f.filename or "unknown", f.content_type or "")
            results.append(result if "error" not in result else {
                "filename": f.filename, "status": "error", "error": result["error"]
            })
        except Exception as e:
            results.append({"filename": f.filename, "status": "error", "error": str(e)})
    return {
        "total": len(files),
        "success": sum(1 for r in results if r.get("status") != "error"),
        "results": results,
    }


# ═══════════════════════════════════════════════════════════════
# 对账
# ═══════════════════════════════════════════════════════════════

@router.post("/{invoice_number}/reconcile")
def route_reconcile(invoice_number: str, body: dict):
    """手动关联WMS入库单"""
    if not invoice_number or not invoice_number.strip():
        raise HTTPException(400, "发票号码不能为空")
    result = svc.reconcile_invoice(invoice_number, body.get("inbound_id", ""))
    if not result:
        raise HTTPException(404, "发票未找到")
    return {"ok": True}


# ═══════════════════════════════════════════════════════════════
# 解析（暂为占位，后续对接解析引擎后启用完整四级链）
# ═══════════════════════════════════════════════════════════════

@router.post("/parse")
def route_parse(body: dict):
    """解析发票文件（占位：直接保存为待处理记录）"""
    file_path = body.get("file_path", "")
    filename = body.get("filename", "")
    source = body.get("source", "upload")
    if not file_path:
        raise HTTPException(400, "缺少 file_path")
    import os
    from pathlib import Path
    upload_dir = Path(svc.UPLOAD_DIR).resolve()
    resolved = Path(file_path).resolve()
    if not str(resolved).startswith(str(upload_dir) + os.sep) and resolved != upload_dir:
        raise HTTPException(400, "非法文件路径")
    if not os.path.exists(file_path):
        raise HTTPException(400, "文件不存在")
    # 创建一条待处理记录，后续由解析引擎接管
    invoice = svc.create_invoice({
        "invoice_number": "",
        "file_path": file_path,
        "source": source,
        "status": "pending",
        "remark": f"待解析: {filename}",
    })
    return {"status": "ok", "invoice": invoice}


@router.post("/auto-match")
def route_auto_match(body: dict):
    """发票自动匹配WMS入库单（简化版：按供应商名匹配）"""
    invoice = body.get("invoice", {})
    from core.database import all_
    inbounds = all_("inbound")
    seller_name = invoice.get("seller_name", "")
    amount = float(invoice.get("total_amount", 0) or 0)
    matches = []
    for ib in inbounds:
        ib_amount = float(ib.get("total_amount", 0) or 0)
        if ib_amount and amount and abs(ib_amount - amount) / max(ib_amount, amount) < 0.01:
            matches.append({
                "inbound_id": ib.get("id"),
                "inbound_date": ib.get("date"),
                "amount": ib_amount,
                "confidence": "high",
            })
    if not matches and seller_name:
        for ib in inbounds:
            if seller_name in ib.get("supplier_name", ""):
                matches.append({
                    "inbound_id": ib.get("id"),
                    "inbound_date": ib.get("date"),
                    "amount": ib.get("total_amount"),
                    "confidence": "low",
                })
    return {"status": "ok", "matches": matches, "total_matches": len(matches)}


@router.post("/audit")
def route_audit():
    return svc.audit_invoices()


@router.post("/audit/fix")
def route_audit_fix(body: dict):
    fixes = body.get("fixes", [])
    if not fixes:
        raise HTTPException(400, "fixes 不能为空")
    return svc.apply_audit_fix(fixes)
