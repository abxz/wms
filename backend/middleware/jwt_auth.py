"""JWT认证中间件 — 保护API端点"""
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from jose import jwt, JWTError
import os
from datetime import datetime

# 统一 JWT 密钥 — 三项目共享同一密钥
JWT_SECRET = os.environ.get("JWT_SECRET")
if not JWT_SECRET:
    _key_file = "/root/.hermes/shared/jwt.key"
    if os.path.exists(_key_file):
        JWT_SECRET = open(_key_file).read().strip()
if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET 环境变量或 /root/.hermes/shared/jwt.key 必须配置")

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
        
        # 所有 /api/ 路由需要认证
        if request.url.path.startswith("/api/"):
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
