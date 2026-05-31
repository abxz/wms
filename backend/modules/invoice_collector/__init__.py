"""采集层 — 邮箱IMAP + 飞书Webhook + Web上传"""
from fastapi import APIRouter, UploadFile, File, HTTPException, Request
from core.config import DATA_DIR
from core.utils import generate_id
from pathlib import Path
import json
import os
import re
from datetime import datetime

router = APIRouter(prefix="/api/invoice-collector", tags=["发票采集"])
UPLOAD_DIR = DATA_DIR / "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

CONFIG_FILE = DATA_DIR / "collector_config.json"


def _load_config() -> dict:
    if CONFIG_FILE.exists():
        return json.loads(CONFIG_FILE.read_text())
    return {}


def _save_config(cfg: dict):
    CONFIG_FILE.write_text(json.dumps(cfg, ensure_ascii=False, indent=2))


def register(app):
    app.include_router(router)


# ── Web上传 ──

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    allowed = {
        "application/pdf", "application/xml", "text/xml",
        "image/jpeg", "image/png", "application/zip",
    }
    if file.content_type not in allowed:
        raise HTTPException(400, f"不支持的文件类型: {file.content_type}")
    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(413, "文件超过5MB限制")
    safe_name = re.sub(r'[^\w\.\-]', '_', file.filename or "file")
    file_id = generate_id()
    save_path = UPLOAD_DIR / f"{file_id}_{safe_name}"
    with open(save_path, "wb") as f:
        f.write(contents)
    return {"file_id": file_id, "filename": safe_name, "size": len(contents), "path": str(save_path), "status": "pending"}


@router.post("/upload/batch")
async def batch_upload(files: list[UploadFile] = File(...)):
    results = []
    for f in files:
        try:
            result = await upload_file(f)
            results.append(result)
        except HTTPException as e:
            results.append({"filename": f.filename, "status": "error", "error": e.detail})
    return {"total": len(files), "success": sum(1 for r in results if r.get("status") != "error"), "results": results}


# ── 邮箱配置 ──

@router.post("/email/config")
def set_email_config(body: dict):
    from middleware.encrypt import encrypt
    cfg = _load_config()
    raw_password = body.get("password", "")
    cfg["email"] = {
        "imap_server": body.get("imap_server"),
        "imap_port": body.get("imap_port", 993),
        "account": body.get("account"),
        "password_encrypted": encrypt(raw_password) if raw_password else "",
        "sender_whitelist": body.get("sender_whitelist", []),
        "interval_minutes": body.get("interval_minutes", 5),
    }
    _save_config(cfg)
    return {"ok": True}


@router.get("/email/config")
def get_email_config():
    return _load_config().get("email", {})


@router.get("/collector-status")
def get_collector_status():
    from modules.invoices.service import UPLOAD_DIR
    file_count = len(list(UPLOAD_DIR.iterdir())) if UPLOAD_DIR.exists() else 0
    return {
        "email": {"enabled": True, "type": "IMAP轮询", "interval": "5分钟"},
        "feishu": {"enabled": True, "type": "Webhook推送", "interval": "实时"},
        "upload": {"enabled": True, "type": "手动上传", "interval": "按需"},
        "total_files": file_count,
    }
