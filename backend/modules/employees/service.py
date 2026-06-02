"""员工业务逻辑"""
from core.database import all_, get_by_id, get_by, add, update, delete, paginate
from modules.employees.model import Employee, ClaimRecord
from core.utils import generate_id
from datetime import datetime

EMPFILE = "employees"
CLAIMFILE = "claims"
SEARCH_FIELDS = ["name", "employee_no", "department", "role", "position"]

# 岗位前缀映射（新格式）
POSITION_PREFIX = {
    "班组长": "BZ",
    "代班长": "DB",
    "队长": "DZ",
    "车间主任": "CJ",
    "安全主管": "AQ",
    # 兼容旧岗位
    "技术员": "JS",
    "管理员": "GL",
    "保管员": "BG",
    "采购员": "CG",
    "质检员": "ZJ",
    "安全员": "AQ",
    "普通员工": "PT",
    "爆破工": "BP",
    "电工": "DG",
    "仓管员": "CG",
    "主管": "ZG",
    "司机": "SJ",
    "搬运工": "BY",
    "维修工": "WX",
    "化验员": "HY",
}


def _get_pinyin_initials(name: str) -> str:
    """获取姓名拼音首字母（姓+名各取首字母，大写）"""
    try:
        from pypinyin import pinyin, Style
        if not name or len(name) < 2:
            return name.upper()[:2] if name else "XX"
        surname = name[0]
        given = name[1:]
        s_initial = pinyin(surname, style=Style.FIRST_LETTER)[0][0][0].upper()
        g_initial = pinyin(given, style=Style.FIRST_LETTER)[0][0][0].upper()
        return s_initial + g_initial
    except Exception:
        # fallback: 直接取前两个字符大写
        return name[:2].upper() if len(name) >= 2 else name.upper().ljust(2, "X")


def generate_employee_no(position: str, name: str = "") -> str:
    """根据岗位+姓名生成员工编号，格式：{岗位缩写}_{姓名缩写}_{三位序号}"""
    prefix = POSITION_PREFIX.get(position, "QT")
    initials = _get_pinyin_initials(name) if name else "XX"

    # 找出该岗位+姓名缩写下的最大序号
    pattern_prefix = f"{prefix}_{initials}_"
    max_seq = 0
    for emp in all_(EMPFILE):
        eno = emp.get("employee_no", "")
        if eno.startswith(pattern_prefix):
            try:
                seq = int(eno.split("_")[-1])
                if seq > max_seq:
                    max_seq = seq
            except (ValueError, IndexError):
                pass

    return f"{prefix}_{initials}_{max_seq + 1:03d}"


def list_employees(page=1, size=20, search=""):
    return paginate(EMPFILE, page, size, search, search_fields=SEARCH_FIELDS)

def get_employee(eid: str):
    return get_by_id(EMPFILE, eid)

def create_employee(data: dict) -> dict:
    emp = Employee(**data)
    emp.id = generate_id()
    if not emp.employee_no:
        emp.employee_no = generate_employee_no(emp.position or "", emp.name or "")
    if not emp.qr_code:
        emp.qr_code = f"QR-EMP-{emp.id}"
    emp.role = data.get("role", "claimer")
    data = emp.model_dump(); data.pop('created_at', None); data.pop('updated_at', None)
    return add(EMPFILE, data)

def update_employee(eid: str, data: dict) -> dict | None:
    return update(EMPFILE, eid, data)

def delete_employee(eid: str) -> bool:
    return delete(EMPFILE, eid)

def reset_quota(eid: str) -> dict | None:
    return update(EMPFILE, eid, {"monthly_used": 0})

def get_claims(eid: str) -> list[dict]:
    return [c for c in all_(CLAIMFILE) if c.get("employee_id") == eid]

def add_claim(data: dict) -> dict:
    c = ClaimRecord(**data)
    c.id = generate_id()
    c.date = datetime.now().isoformat(timespec="seconds")
    d = c.model_dump()
    return add(CLAIMFILE, d)

def login_by_qr(qr_code: str) -> dict | None:
    """PDA 扫码登录：按二维码查找管理员"""
    for emp in all_(EMPFILE):
        if emp.get("qr_code") == qr_code and emp.get("role") in ("admin", "super_admin"):
            return emp
    return None
