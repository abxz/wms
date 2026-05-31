"""发票分类+重命名模块 — 归档管理"""
from fastapi import APIRouter
from core.config import DATA_DIR
from pathlib import Path
import json
import re
import shutil
import os
from datetime import datetime

router = APIRouter(prefix="/api/invoice-classifier", tags=["发票分类"])
ARCHIVE_DIR = DATA_DIR.parent / "archive"
os.makedirs(ARCHIVE_DIR, exist_ok=True)

CONFIG_FILE = DATA_DIR / "classifier_config.json"

DEFAULT_CONFIG = {
    "naming_template": "{amount}_{issue_date}_{invoice_number}_{seller_name}",
    "tax_type_first": ["数电票", "专票", "普票（电子）", "普票（纸质）", "其他"],
}


def _load_config() -> dict:
    if CONFIG_FILE.exists():
        return json.loads(CONFIG_FILE.read_text())
    return DEFAULT_CONFIG.copy()


def _save_config(cfg: dict):
    CONFIG_FILE.write_text(json.dumps(cfg, ensure_ascii=False, indent=2))


def register(app):
    app.include_router(router)


def _sanitize_filename(name: str) -> str:
    return re.sub(r'[\\/:*?"<>|]', '_', str(name))


@router.post("/process")
def process_invoice(body: dict):
    """对解析后的发票执行重命名+分类归档"""
    invoice = body.get("invoice", {})
    if not invoice:
        return {"status": "error", "error": "缺少发票数据"}
    cfg = _load_config()
    amount = invoice.get("total_amount", 0)
    issue_date = invoice.get("issue_date", datetime.now().strftime("%Y-%m-%d"))
    invoice_number = invoice.get("invoice_number", "unknown")
    seller_name = invoice.get("seller_name", "未知")
    amount_str = f"{float(amount):.2f}"
    date_str = issue_date.replace("-", "").replace("/", "")
    new_name = f"{amount_str}_{date_str}_{invoice_number}_{_sanitize_filename(seller_name)}"[:200]
    src_path = invoice.get("file_path", "")
    ext = Path(src_path).suffix if src_path else ".pdf"
    new_name += ext
    invoice_type = _sanitize_filename(invoice.get("invoice_type", "其他"))
    seller_short = _sanitize_filename(seller_name)[:30]
    month_dir = issue_date[:7] if len(issue_date) >= 7 else datetime.now().strftime("%Y-%m")
    dest_dir = ARCHIVE_DIR / invoice_type / seller_short / month_dir
    os.makedirs(dest_dir, exist_ok=True)
    dest_path = dest_dir / new_name
    if src_path and os.path.exists(src_path):
        from core.config import DATA_DIR
        upload_dir = (DATA_DIR / "uploads").resolve()
        resolved_src = Path(src_path).resolve()
        if not str(resolved_src).startswith(str(upload_dir) + os.sep) and resolved_src != upload_dir:
            return {"status": "error", "error": "非法源文件路径"}
        if dest_path.exists():
            dest_path = dest_dir / f"{dest_path.stem}_{datetime.now().strftime('%H%M%S')}{ext}"
        shutil.copy2(src_path, dest_path)
    return {"status": "ok", "new_name": new_name, "dest_path": str(dest_path), "dest_dir": str(dest_dir)}


@router.post("/config")
def set_config(body: dict):
    cfg = _load_config()
    if "naming_template" in body:
        cfg["naming_template"] = body["naming_template"]
    if "tax_type_first" in body:
        cfg["tax_type_first"] = body["tax_type_first"]
    _save_config(cfg)
    return {"ok": True}


@router.get("/config")
def get_config():
    return _load_config()


@router.get("/stats")
def get_classify_stats():
    stats = {}
    if ARCHIVE_DIR.exists():
        for tax_type in os.listdir(ARCHIVE_DIR):
            type_dir = ARCHIVE_DIR / tax_type
            if type_dir.is_dir():
                seller_count = len([d for d in type_dir.iterdir() if d.is_dir()])
                file_count = sum(
                    len([f for f in seller.iterdir() if f.is_file()])
                    for seller in type_dir.iterdir() if seller.is_dir()
                )
                stats[tax_type] = {"suppliers": seller_count, "files": file_count}
    return stats
