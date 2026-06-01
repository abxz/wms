"""仓储管理系统 - 通用工具函数"""
import re
from datetime import datetime
from uuid import uuid4


def generate_order_no(prefix: str = "IN") -> str:
    """Generate order number using system_config table (atomic)"""
    from core.database import get_by, add, update, SessionLocal
    from sqlalchemy import select
    import models  # ensure _TABLE_MODEL populated

    mapping = {"IN": "inbound", "OUT": "outbound"}
    base = mapping.get(prefix.upper(), prefix.lower())
    key = f"{base}_current_no"
    default = f"{prefix}-0001"

    M = models.SystemConfig
    with SessionLocal() as db:
        row = db.query(M).with_for_update().filter(M.key == key).first()
        if not row:
            # bootstrap
            current = default
            db.add(M(id=uuid4().hex[:12], key=key, value=current))
            db.commit()
        else:
            current = row.value
            match = re.search(r'(\d+)$', current)
            if match:
                next_val = current[:match.start(1)] + str(int(match.group(1)) + 1).zfill(len(match.group(1)))
                row.value = next_val
                db.commit()
    return current


def parse_barcode(data: str) -> dict:
    if re.match(r"^\d+$", data):
        return {"type": "id", "value": data}
    if re.match(r"^\d{8,13}$", data):
        return {"type": "barcode", "value": data}
    return {"type": "unknown", "value": data}


def safe_float(val) -> float:
    try:
        return float(val)
    except (ValueError, TypeError):
        return 0.0


def generate_id() -> str:
    return uuid4().hex[:12]
