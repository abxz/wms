"""员工业务逻辑"""
from core.database import all_, get_by_id, get_by, add, update, delete, paginate
from modules.employees.model import Employee, ClaimRecord
from core.utils import generate_id
from datetime import datetime

EMPFILE = "employees"
CLAIMFILE = "claims"
SEARCH_FIELDS = ["name", "employee_no", "department", "role"]

def list_employees(page=1, size=20, search=""):
    return paginate(EMPFILE, page, size, search, search_fields=SEARCH_FIELDS)

def get_employee(eid: str):
    return get_by_id(EMPFILE, eid)

def create_employee(data: dict) -> dict:
    emp = Employee(**data)
    emp.id = generate_id()
    if not emp.employee_no:
        emp.employee_no = f"E{emp.id}"
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
