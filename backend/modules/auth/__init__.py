"""PDA 认证模块 — JWT版"""
from fastapi import APIRouter, HTTPException
from modules.employees import service as emp_svc
from jose import jwt, JWTError
from datetime import datetime, timedelta
import os

router = APIRouter(prefix="/api/auth", tags=["PDA认证"])

# JWT配置 — 统一从密钥文件读取（与中间件完全一致）
_key_file = "/root/.hermes/shared/jwt.key"
if os.path.exists(_key_file):
    JWT_SECRET = open(_key_file).read().strip()
else:
    JWT_SECRET = os.environ.get("JWT_SECRET", "")
if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET 环境变量或 /root/.hermes/shared/jwt.key 必须配置")
import hashlib as _ahash
_AUTH_KEY_HASH = _ahash.sha256(JWT_SECRET.encode()).hexdigest()[:12]
print(f"[AUTH] auth module key hash: {_AUTH_KEY_HASH}", flush=True)
ACCESS_TOKEN_EXPIRE_MINUTES = 60
REFRESH_TOKEN_EXPIRE_DAYS = 30

def create_access_token(data: dict) -> str:
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {**data, "exp": expire, "type": "access"}
    return jwt.encode(to_encode, JWT_SECRET, algorithm="HS256")

def create_refresh_token(data: dict) -> str:
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode = {**data, "exp": expire, "type": "refresh"}
    return jwt.encode(to_encode, JWT_SECRET, algorithm="HS256")

def verify_token(token: str) -> dict:
    """验证token，返回payload"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload
    except JWTError:
        return None

def register(app):
    app.include_router(router)

@router.post("/pda-login")
def pda_login(body: dict):
    qr_code = body.get("qr_code", "")
    emp = emp_svc.login_by_qr(qr_code)
    if not emp:
        raise HTTPException(403, "未授权的二维码")
    
    payload = {
        "admin_id": emp["id"],
        "admin_name": emp["name"],
        "role": emp.get("role", "admin")
    }
    return {
        "token": create_access_token(payload),
        "refresh_token": create_refresh_token(payload),
        "admin_id": emp["id"],
        "admin_name": emp["name"],
        "role": emp.get("role", "admin"),
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60
    }

@router.post("/login")
def web_login(body: dict):
    """Web管理端登录：员工工号+姓名（或admin/admin默认账号）"""
    username = body.get("username", "").strip()
    password = body.get("password", "").strip()
    if not username or not password:
        raise HTTPException(400, "用户名和密码不能为空")

    # 默认超级管理员账号
    if username == "admin" and password == "123":
        payload = {"admin_id": "admin", "admin_name": "管理员", "role": "super_admin"}
        return {
            "token": create_access_token(payload),
            "refresh_token": create_refresh_token(payload),
            **payload,
            "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        }

    # 按工号查找员工（密码=工号，或密码=姓名）
    from core.database import all_
    employees = all_("employees")
    emp = next(
        (e for e in employees
         if e.get("employee_no") == username and
            (password == e.get("employee_no") or password == e.get("name"))
         ), None
    )
    if not emp:
        raise HTTPException(401, "用户名或密码错误")
    if emp.get("role") not in ("admin", "super_admin"):
        raise HTTPException(403, "权限不足，仅管理员可登录")

    payload = {"admin_id": emp["id"], "admin_name": emp["name"], "role": emp.get("role", "admin")}
    return {
        "token": create_access_token(payload),
        "refresh_token": create_refresh_token(payload),
        **payload,
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    }


@router.post("/pda-logout")
def pda_logout(body: dict):
    return {"ok": True}

@router.post("/pda-verify")
def pda_verify(body: dict):
    token = body.get("token", "")
    payload = verify_token(token)
    if not payload:
        raise HTTPException(401, "登录已过期或无效")
    return payload

@router.post("/auth/refresh")
def refresh_token(body: dict):
    refresh = body.get("refresh_token", "")
    payload = verify_token(refresh)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(401, "Refresh token无效")
    
    new_payload = {
        "admin_id": payload["admin_id"],
        "admin_name": payload["admin_name"],
        "role": payload.get("role", "admin")
    }
    return {
        "token": create_access_token(new_payload),
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60
    }
