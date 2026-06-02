"""劳保用品业务逻辑"""
from core.database import all_, get_by_id, add, update, delete, paginate
from modules.labor_protection.model import LaborSupply, PositionLaborConfig, LaborDistribution
from core.utils import generate_id
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta

SUPPLY_TABLE = "labor_supplies"
CONFIG_TABLE = "position_labor_config"
DIST_TABLE = "labor_distributions"

SUPPLY_SEARCH = ["name", "category"]
CONFIG_SEARCH = ["position", "supply_name"]
DIST_SEARCH = ["employee_name", "employee_no", "supply_name"]


# ── 劳保用品目录 ──────────────────────────────────────────────────────────────

def list_supplies(page=1, size=20, search=""):
    return paginate(SUPPLY_TABLE, page, size, search, search_fields=SUPPLY_SEARCH)

def get_supply(sid: str):
    return get_by_id(SUPPLY_TABLE, sid)

def create_supply(data: dict):
    s = LaborSupply(**data)
    s.id = generate_id()
    return add(SUPPLY_TABLE, s.model_dump())

def update_supply(sid: str, data: dict):
    return update(SUPPLY_TABLE, sid, data)

def delete_supply(sid: str):
    return delete(SUPPLY_TABLE, sid)

def list_all_supplies():
    return all_(SUPPLY_TABLE)


def get_low_stock_supplies() -> list[dict]:
    """返回库存低于预警阈值的用品"""
    return [s for s in all_(SUPPLY_TABLE)
            if s.get("active") and s.get("current_stock", 0) < s.get("warning_threshold", 10)]


# ── 岗位配置 ──────────────────────────────────────────────────────────────────

def list_configs(page=1, size=20, search=""):
    return paginate(CONFIG_TABLE, page, size, search, search_fields=CONFIG_SEARCH)

def get_config(cid: str):
    return get_by_id(CONFIG_TABLE, cid)

def create_config(data: dict):
    c = PositionLaborConfig(**data)
    c.id = generate_id()
    return add(CONFIG_TABLE, c.model_dump())

def update_config(cid: str, data: dict):
    return update(CONFIG_TABLE, cid, data)

def delete_config(cid: str):
    return delete(CONFIG_TABLE, cid)

def list_all_configs():
    return all_(CONFIG_TABLE)


def get_configs_by_position(position: str) -> list[dict]:
    """获取某岗位的所有劳保用品配置"""
    return [c for c in all_(CONFIG_TABLE)
            if c.get("position") == position and c.get("active")]


# ── 领取记录 ──────────────────────────────────────────────────────────────────

def list_distributions(page=1, size=20, search=""):
    return paginate(DIST_TABLE, page, size, search, search_fields=DIST_SEARCH)

def get_distribution(did: str):
    return get_by_id(DIST_TABLE, did)


def calc_next_date(actual_date: str, cycle_months: int) -> str:
    """根据实际领取日期+周期计算下次应领取日期"""
    try:
        dt = datetime.fromisoformat(actual_date)
    except (ValueError, TypeError):
        dt = datetime.now()
    next_dt = dt + relativedelta(months=cycle_months)
    return next_dt.date().isoformat()


def get_last_distribution(employee_id: str, supply_id: str) -> dict | None:
    """获取某员工某用品的最近一次领取记录"""
    dists = [d for d in all_(DIST_TABLE)
             if d.get("employee_id") == employee_id and d.get("supply_id") == supply_id]
    if not dists:
        return None
    dists.sort(key=lambda x: x.get("actual_date", ""), reverse=True)
    return dists[0]


def distribute(body: dict) -> dict:
    """员工领取劳保用品"""
    employee_id = body.get("employee_id")
    supply_id = body.get("supply_id")
    qty = float(body.get("quantity", 1))
    remark = body.get("remark", "")

    emp = get_by_id("employees", employee_id)
    if not emp:
        raise ValueError("员工不存在")

    supply = get_by_id(SUPPLY_TABLE, supply_id)
    if not supply:
        raise ValueError("劳保用品不存在")

    # 检查库存
    current_stock = supply.get("current_stock", 0)
    if current_stock <= 0:
        raise ValueError("库存不足，当前库存为0")

    position = emp.get("position", "")
    now = datetime.now()
    actual_date = now.date().isoformat()

    # 查找岗位配置，获取周期
    cycle_months = supply.get("default_cycle_months", 12)
    configs = [c for c in get_configs_by_position(position)
               if c.get("supply_id") == supply_id]
    if configs:
        cycle_months = configs[0].get("cycle_months", cycle_months)

    # 计算应领取日期（上次领取日期 + 周期）
    last = get_last_distribution(employee_id, supply_id)
    if last:
        planned_date = last.get("next_date", actual_date)
    else:
        planned_date = actual_date

    # 计算下次应领取日期
    next_date = calc_next_date(actual_date, cycle_months)

    # 扣减 current_stock
    new_stock = max(0, current_stock - int(qty))
    update(SUPPLY_TABLE, supply_id, {"current_stock": new_stock})

    # 库存预警通知
    warning_threshold = supply.get("warning_threshold", 10)
    if new_stock < warning_threshold:
        from modules.notifications.service import create_notification
        create_notification(
            "库存警告",
            f"库存不足：{supply.get('name', '')}",
            f"当前库存 {new_stock} {supply.get('unit', '')}，低于预警阈值 {warning_threshold}",
        )

    # 扣减库存（如果该用品关联了商品）
    linked_product_id = supply.get("linked_product_id", "")
    if linked_product_id:
        from modules.inventory.service import update_stock
        update_stock(linked_product_id, -qty)

    d = LaborDistribution(
        employee_id=employee_id,
        employee_name=emp.get("name", ""),
        employee_no=emp.get("employee_no", ""),
        position=position,
        supply_id=supply_id,
        supply_name=supply.get("name", ""),
        quantity=qty,
        planned_date=planned_date,
        actual_date=actual_date,
        next_date=next_date,
        cycle_months=cycle_months,
        remark=remark,
    )
    d.id = generate_id()
    return add(DIST_TABLE, d.model_dump())


def get_employee_pending(position: str = "") -> list[dict]:
    """获取所有员工待领取的劳保用品（已过期或即将到期）"""
    today = datetime.now().date()
    result = []
    employees = all_("employees")
    if position:
        employees = [e for e in employees if e.get("position") == position]

    for emp in employees:
        configs = get_configs_by_position(emp.get("position", ""))
        for cfg in configs:
            supply_id = cfg.get("supply_id")
            last = get_last_distribution(emp["id"], supply_id)
            if last:
                next_str = last.get("next_date", "")
                try:
                    next_dt = datetime.fromisoformat(next_str).date()
                except (ValueError, TypeError):
                    continue
                days_remaining = (next_dt - today).days
            else:
                # 从未领取过
                days_remaining = -999
                next_str = ""

            result.append({
                "employee_id": emp["id"],
                "employee_name": emp.get("name", ""),
                "employee_no": emp.get("employee_no", ""),
                "position": emp.get("position", ""),
                "supply_id": supply_id,
                "supply_name": cfg.get("supply_name", ""),
                "cycle_months": cfg.get("cycle_months", 12),
                "qty_per_cycle": cfg.get("qty_per_cycle", 1),
                "next_date": next_str,
                "days_remaining": days_remaining,
            })

    # 按紧急程度排序（过期在前）
    result.sort(key=lambda x: x["days_remaining"])
    return result


# ── 国标默认数据初始化 ────────────────────────────────────────────────────────

GB_DEFAULTS = [
    {"name": "安全帽", "category": "头部防护", "unit": "顶", "default_cycle_months": 12, "gb_ref": "GB 39800.1-2020"},
    {"name": "防尘口罩", "category": "呼吸防护", "unit": "个", "default_cycle_months": 1, "gb_ref": "GB 39800.1-2020"},
    {"name": "防毒面具", "category": "呼吸防护", "unit": "个", "default_cycle_months": 24, "gb_ref": "GB 39800.1-2020"},
    {"name": "护目镜", "category": "眼面防护", "unit": "副", "default_cycle_months": 12, "gb_ref": "GB 39800.1-2020"},
    {"name": "工作服", "category": "躯体防护", "unit": "套", "default_cycle_months": 18, "gb_ref": "GB 39800.1-2020"},
    {"name": "安全鞋", "category": "足部防护", "unit": "双", "default_cycle_months": 12, "gb_ref": "GB 39800.1-2020"},
    {"name": "劳保手套", "category": "手部防护", "unit": "双", "default_cycle_months": 1, "gb_ref": "GB 39800.1-2020"},
    {"name": "安全带", "category": "防坠落", "unit": "条", "default_cycle_months": 24, "gb_ref": "GB 39800.1-2020"},
    {"name": "绝缘手套", "category": "手部防护", "unit": "双", "default_cycle_months": 6, "gb_ref": "GB 39800.1-2020"},
    {"name": "耳塞/耳罩", "category": "听力防护", "unit": "副", "default_cycle_months": 3, "gb_ref": "GB 39800.1-2020"},
    {"name": "反光背心", "category": "躯体防护", "unit": "件", "default_cycle_months": 12, "gb_ref": "GB 39800.1-2020"},
    {"name": "防尘面罩", "category": "呼吸防护", "unit": "个", "default_cycle_months": 6, "gb_ref": "GB 39800.1-2020"},
]


def init_gb_defaults() -> int:
    """初始化国标默认劳保用品，返回新增数量"""
    existing = {s["name"] for s in all_(SUPPLY_TABLE)}
    count = 0
    for item in GB_DEFAULTS:
        if item["name"] not in existing:
            s = LaborSupply(**item)
            s.id = generate_id()
            add(SUPPLY_TABLE, s.model_dump())
            count += 1
    return count
