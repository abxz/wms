"""JWT认证中间件 — 保护API端点"""
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from jose import jwt, JWTError
import os
from datetime import datetime

JWT_SECRET = os.environ.get(
    "WMS_JWT_SECRET",
    open("/root/.invoice-center/secrets/jwt.key").read().strip()
    if os.path.exists("/root/.invoice-center/secrets/jwt.key")
    else "dev-secret-change-in-production"
)

# 免认证路径白名单
PUBLIC_PATHS = {
    "/api/health",
    "/api/auth/pda-login",
    "/api/auth/auth/refresh",
    "/docs",
    "/openapi.json",
    "/redoc",
}

class JWTAuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # 免认证路径放行
        if request.url.path in PUBLIC_PATHS:
            return await call_next(request)
        
        # PDA专用API（前缀 /api/pda/）需要认证
        if request.url.path.startswith("/api/pda/"):
            auth_header = request.headers.get("Authorization", "")
            if not auth_header.startswith("Bearer "):
                raise HTTPException(401, "缺少认证令牌")
            
            token = auth_header[7:]
            try:
                payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
                request.state.user = payload
            except JWTError:
                raise HTTPException(401, "令牌无效或已过期")
        
        return await call_next(request)
