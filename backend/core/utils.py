"""仓储管理系统 - 通用工具函数"""
import re
from datetime import datetime
from uuid import uuid4


def generate_order_no(prefix: str = "IN") -> str:
    """生成单号：从 system_config.json 读取当前号并递增"""
    import json
    from core.config import DATA_DIR
    
    config_path = DATA_DIR / "system_config.json"
    if not config_path.exists():
        config = {
            "inbound_prefix": "IN-",
            "inbound_start_no": "IN-0001",
            "inbound_current_no": "IN-0001",
            "outbound_prefix": "OUT-",
            "outbound_start_no": "OUT-0001",
            "outbound_current_no": "OUT-0001",
            "max_items_per_order": 7
        }
        with open(config_path, "w", encoding="utf-8") as f:
            json.dump(config, f, ensure_ascii=False, indent=2)

    with open(config_path, "r", encoding="utf-8") as f:
        config = json.load(f)

    # 映射：IN → inbound, OUT → outbound
    mapping = {"IN": "inbound", "OUT": "outbound"}
    base = mapping.get(prefix.upper(), prefix.lower())
    key = f"{base}_current_no"

    if key not in config:
        now = datetime.now()
        return f"{prefix}{now.strftime('%Y%m%d%H%M%S')}"

    current = config[key]
    match = re.search(r'(\d+)$', current)
    if not match:
        return current
    num = int(match.group(1))
    next_num = num + 1
    digits = len(match.group(1))
    next_val = current[:match.start(1)] + str(next_num).zfill(digits)

    config[key] = next_val
    with open(config_path, "w", encoding="utf-8") as f:
        json.dump(config, f, ensure_ascii=False, indent=2)

    return current


def parse_barcode(data: str) -> dict:
    """解析条码数据（支持多种格式）"""
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
