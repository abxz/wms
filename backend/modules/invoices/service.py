"""发票业务逻辑 — 增强版（CRUD + 四级解析链 + 采集入口）"""
from core.database import all_, get_by_id, add, update, delete, paginate
from modules.invoices.model import Invoice
from core.utils import generate_id
from core.config import DATA_DIR
from datetime import datetime
import json
import os
import re
import hashlib
import shutil
from pathlib import Path

FILE = "invoices"
SEARCH_FIELDS = ["invoice_number", "invoice_code", "seller_name", "buyer_name"]
UPLOAD_DIR = DATA_DIR / "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ─── 基础CRUD ────────────────────────────────────────────────

def list_invoices(page=1, size=20, search="", status=""):
    data = all_(FILE)
    if search:
        s = search.lower()
        data = [d for d in data if any(s in str(d.get(f, "")).lower() for f in SEARCH_FIELDS)]
    if status:
        data = [d for d in data if d.get("status") == status]
    data.sort(key=lambda d: d.get("updated_at", ""), reverse=True)
    total = len(data)
    start = (page - 1) * size
    return {
        "items": data[start:start + size],
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size,
    }


def get_invoice(iid: str):
    return get_by_id(FILE, iid)


def create_invoice(data: dict) -> dict:
    inv = Invoice(**data)
    inv.id = generate_id()
    if not inv.issue_date:
        inv.issue_date = datetime.now().strftime("%Y-%m-%d")
    return add(FILE, inv.model_dump(exclude={"created_at", "updated_at"}))


def update_invoice(iid: str, data: dict) -> dict | None:
    return update(FILE, iid, data)


def delete_invoice(iid: str) -> bool:
    return delete(FILE, iid)


# ─── 文件上传 ────────────────────────────────────────────────

def handle_upload(file_bytes: bytes, filename: str, content_type: str) -> dict:
    """上传发票文件（MIME校验+大小限制+防路径穿越）"""
    allowed_mime = {
        "application/pdf", "application/xml", "text/xml",
        "image/jpeg", "image/png", "application/zip",
    }
    if content_type not in allowed_mime:
        return {"error": f"不支持的文件类型: {content_type}"}

    if len(file_bytes) > 5 * 1024 * 1024:
        return {"error": "文件超过5MB限制"}

    safe_name = re.sub(r'[^\w\.\-]', '_', filename)
    file_id = generate_id()
    save_path = UPLOAD_DIR / f"{file_id}_{safe_name}"

    with open(save_path, "wb") as f:
        f.write(file_bytes)

    return {
        "file_id": file_id,
        "filename": safe_name,
        "size": len(file_bytes),
        "path": str(save_path),
    }


# ─── 文件哈希 ────────────────────────────────────────────────

def _file_hash(file_path: str) -> str:
    h = hashlib.sha256()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


# ─── 去重 ────────────────────────────────────────────────────

def _is_duplicate(invoice: dict, existing: list) -> bool:
    file_hash = invoice.get("file_hash", "")
    if file_hash and any(i.get("file_hash") == file_hash for i in existing):
        return True
    code = invoice.get("invoice_code", "")
    number = invoice.get("invoice_number", "")
    seller_tax = invoice.get("seller_tax_no", "")
    for i in existing:
        if code and i.get("invoice_code") == code and i.get("invoice_number") == number:
            return True
        if not code and i.get("invoice_number") == number and i.get("seller_tax_no") == seller_tax:
            return True
    return False


# ─── 保存解析结果 ─────────────────────────────────────────────

def save_parsed_invoice(data: dict) -> dict:
    """保存解析后的发票（含去重）"""
    existing = all_(FILE)
    if data.get("file_path"):
        data.setdefault("file_hash", _file_hash(data["file_path"]))
    if _is_duplicate(data, existing):
        return {"status": "duplicate", "invoice_number": data.get("invoice_number")}
    data["status"] = data.get("status", "pending")
    return get_by_id(FILE, add(FILE, data)["id"])


# ─── 手动关联WMS入库单 ──────────────────────────────────────

def reconcile_invoice(invoice_number: str, inbound_id: str) -> dict | None:
    return update_file_by_field(FILE, "invoice_number", invoice_number, {
        "wms_inbound_id": inbound_id,
        "status": "reconciled",
    })


def update_file_by_field(file: str, field: str, value: str, updates: dict) -> dict | None:
    from core.database import all_, update as db_update, _TABLE_MODEL
    M = _TABLE_MODEL.get(file)
    if M is None:
        return None
    from core.database import SessionLocal, _ts
    with SessionLocal() as db:
        row = db.query(M).filter(getattr(M, field) == value).first()
        if not row:
            return None
        updates["updated_at"] = _ts()
        for k, v in updates.items():
            if hasattr(row, k):
                setattr(row, k, v)
        db.commit()
        db.refresh(row)
        return {c.name: getattr(row, c.name) for c in row.__table__.columns}


# ─── 统计（供看板调用） ──────────────────────────────────────

def get_invoice_stats() -> dict:
    invoices = all_(FILE)
    total = len(invoices)
    today = datetime.now().strftime("%Y-%m-%d")
    this_month = datetime.now().strftime("%Y-%m")

    by_type = {}
    by_source = {}
    by_status = {}
    for inv in invoices:
        t = inv.get("invoice_type", "其他")
        by_type[t] = by_type.get(t, 0) + 1
        s = inv.get("source", "unknown")
        by_source[s] = by_source.get(s, 0) + 1
        st = inv.get("status", "pending")
        by_status[st] = by_status.get(st, 0) + 1

    today_count = sum(1 for inv in invoices if inv.get("created_at", "").startswith(today))
    month_count = sum(1 for inv in invoices if inv.get("created_at", "").startswith(this_month))
    matched = sum(1 for inv in invoices if inv.get("status") == "reconciled")

    return {
        "total": total,
        "today_count": today_count,
        "month_count": month_count,
        "matched_count": matched,
        "auto_match_rate": round(matched / total * 100, 1) if total > 0 else 0,
        "by_type": by_type,
        "by_source": by_source,
        "by_status": by_status,
    }


_AUDIT_FIX_ALLOWED_FIELDS = {"price", "quantity", "min_stock", "max_stock"}


def audit_invoices() -> dict:
    from core.database import all_
    try:
        invoices = all_(FILE)
        products = all_("products")
        inbounds = all_("inbound")
    except Exception as e:
        return {"discrepancies": [], "total": 0, "error": str(e)}
    inbound_map = {ib["id"]: ib for ib in inbounds}
    discrepancies = []
    for inv in invoices:
        inv_no = inv.get("invoice_number", "")
        inbound_id = inv.get("wms_inbound_id", "")
        if not inv_no or not inbound_id:
            continue
        inbound = inbound_map.get(inbound_id)
        if not inbound:
            discrepancies.append({"invoice_number": inv_no, "type": "missing_inbound",
                                   "detail": f"关联入库单 {inbound_id} 不存在"})
            continue
        inv_products = [p for p in products if p.get("invoice_number") == inv_no]
        ib_items = {item["product_id"]: item for item in inbound.get("items", [])}
        for p in inv_products:
            ib_item = ib_items.get(p["id"])
            if not ib_item:
                discrepancies.append({"invoice_number": inv_no, "product_id": p["id"],
                                       "product_name": p.get("name"), "type": "product_not_in_inbound",
                                       "detail": "商品在发票中但不在入库单"})
            else:
                inv_price = float(p.get("price", 0))
                ib_price = float(ib_item.get("price", 0))
                denom = max(inv_price, ib_price)
                if denom > 0 and abs(inv_price - ib_price) / denom > 0.01:
                    discrepancies.append({"invoice_number": inv_no, "product_id": p["id"],
                                           "product_name": p.get("name"), "type": "price_mismatch",
                                           "detail": f"价格不符: 发票¥{inv_price} vs 入库¥{ib_price}",
                                           "fix": {"field": "price", "current": inv_price, "correct": ib_price}})
    return {"discrepancies": discrepancies, "total": len(discrepancies)}


def apply_audit_fix(fixes: list) -> dict:
    applied = 0
    for fix in fixes:
        pid = fix.get("product_id")
        field = fix.get("field")
        value = fix.get("value")
        if pid and field in _AUDIT_FIX_ALLOWED_FIELDS and value is not None:
            update("products", pid, {field: value})
            applied += 1
    return {"applied": applied}
