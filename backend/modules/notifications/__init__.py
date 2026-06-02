"""通知模块"""
from fastapi import APIRouter, Query, HTTPException
from modules.notifications import service as svc

router = APIRouter(prefix="/api/notifications", tags=["通知"])


def register(app):
    app.include_router(router)


@router.get("")
def list_notifications(page: int = Query(1, ge=1), size: int = Query(20, ge=1, le=100), unread_only: bool = False):
    return svc.list_notifications(page, size, unread_only)

@router.get("/unread-count")
def unread_count():
    return {"count": svc.get_unread_count()}

@router.put("/{nid}/read")
def mark_read(nid: str):
    if not svc.mark_read(nid):
        raise HTTPException(404, "通知不存在")
    return {"ok": True}

@router.post("/mark-all-read")
def mark_all_read():
    svc.mark_all_read()
    return {"ok": True}
