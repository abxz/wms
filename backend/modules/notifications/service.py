"""通知业务逻辑"""
from core.database import all_, get_by_id, add, update, paginate
from core.utils import generate_id
from datetime import datetime

TABLE = "notifications"
SEARCH = ["title", "message", "type"]


def list_notifications(page=1, size=20, unread_only=False):
    if unread_only:
        items = [n for n in all_(TABLE) if not n.get("read")]
        items.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        total = len(items)
        start = (page - 1) * size
        return {"items": items[start:start + size], "total": total, "page": page, "pages": max(1, -(-total // size))}
    return paginate(TABLE, page, size, "", search_fields=SEARCH)


def get_unread_count() -> int:
    return sum(1 for n in all_(TABLE) if not n.get("read"))


def mark_read(nid: str) -> bool:
    return bool(update(TABLE, nid, {"read": True}))


def mark_all_read():
    for n in all_(TABLE):
        if not n.get("read"):
            update(TABLE, n["id"], {"read": True})


def create_notification(type_: str, title: str, message: str):
    data = {
        "id": generate_id(),
        "type": type_,
        "title": title,
        "message": message,
        "read": False,
        "created_at": datetime.now().isoformat(),
    }
    add(TABLE, data)
