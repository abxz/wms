"""PDA离线同步模块 — 支持sync_id幂等同步"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import json
import os
from datetime import datetime

router = APIRouter(prefix="/api/pda", tags=["PDA同步"])

DATA_DIR = "/root/projects/warehouse-wms/backend/data/"
SYNC_LOG_FILE = os.path.join(DATA_DIR, "pda_sync_log.json")

os.makedirs(DATA_DIR, exist_ok=True)


def _load_sync_log() -> list:
    if os.path.exists(SYNC_LOG_FILE):
        with open(SYNC_LOG_FILE, "r") as f:
            try:
                return json.load(f)
            except json.JSONDecodeError:
                return []
    return []

def _save_sync_log(logs: list):
    with open(SYNC_LOG_FILE, "w") as f:
        json.dump(logs, f, ensure_ascii=False, indent=2)


class SyncItem(BaseModel):
    sync_id: str
    type: str
    data: dict
    created_at: str


class SyncBatchRequest(BaseModel):
    items: List[SyncItem]


def register(app):
    app.include_router(router)


@router.post("/sync/batch")
def sync_batch(body: SyncBatchRequest):
    """批量同步PDA离线数据（幂等）"""
    sync_log = _load_sync_log()
    existing_ids = {item["sync_id"] for item in sync_log}
    results = []
    
    for item in body.items:
        if item.sync_id in existing_ids:
            results.append({
                "sync_id": item.sync_id,
                "status": "duplicate",
                "message": "已同步过"
            })
            continue
        
        # 记录同步日志（实际业务处理在后续迭代中补充）
        sync_log.append({
            "sync_id": item.sync_id,
            "type": item.type,
            "status": "synced",
            "created_at": item.created_at,
            "synced_at": datetime.utcnow().isoformat(),
            "data_summary": {k: item.data.get(k) for k in ["sku", "qty", "location"] if item.data.get(k)}
        })
        existing_ids.add(item.sync_id)
        
        results.append({
            "sync_id": item.sync_id,
            "status": "synced"
        })
    
    _save_sync_log(sync_log)
    return {
        "results": results,
        "total": len(body.items),
        "synced": sum(1 for r in results if r["status"] == "synced")
    }


@router.get("/sync/status")
def sync_status():
    """查询同步状态"""
    sync_log = _load_sync_log()
    total = len(sync_log)
    today = datetime.utcnow().strftime("%Y-%m-%d")
    today_synced = sum(
        1 for item in sync_log
        if item.get("synced_at", "").startswith(today)
    )
    return {
        "total_synced": total,
        "today_synced": today_synced,
        "last_sync": sync_log[-1]["synced_at"] if sync_log else None,
        "pending_count": 0
    }
