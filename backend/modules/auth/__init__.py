"""PDA 认证模块 — JWT版"""
from fastapi import APIRouter, HTTPException
from modules.employees import service as emp_svc
from jose import jwt, JWTError
from datetime import datetime, timedelta
import os

router = APIRouter(prefix="/api/auth", tags=["PDA认证"])

# JWT配置 — 密钥从环境变量/密钥文件读取
JWT_SECRET = os.environ.get(
    "WMS_JWT_SECRET",
    open("/root/.invoice-center/secrets/jwt.key").read().strip()
    if os.path.exists("/root/.invoice-center/secrets/jwt.key")
    else "dev-secret-change-in-production"
)
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
