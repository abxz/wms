"""JWT认证中间件 — 保护API端点（纯ASGI版本，避免BaseHTTPMiddleware异常链问题）"""
from fastapi import Request
from starlette.responses import JSONResponse
from jose import jwt, JWTError
import os

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
    "/api/auth/login",
    "/api/auth/pda-login",
    "/api/auth/auth/refresh",
    "/docs",
    "/openapi.json",
    "/redoc",
}

# 免认证路径前缀（允许子路径）
PUBLIC_PATH_PREFIXES = {
    "/api/dashboard/",
    "/api/locations/",
    "/api/invoice-classifier/",
    "/api/debug/",
}


class JWTAuthMiddleware:
    """纯ASGI中间件 — 正确处理HTTPException"""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request = Request(scope)
        path = request.url.path

        # 免认证路径放行
        if path in PUBLIC_PATHS:
            await self.app(scope, receive, send)
            return

        for prefix in PUBLIC_PATH_PREFIXES:
            if path.startswith(prefix):
                await self.app(scope, receive, send)
                return

        # 所有 /api/ 路由需要认证
        if path.startswith("/api/"):
            auth_header = request.headers.get("Authorization", "")
            if not auth_header.startswith("Bearer "):
                response = JSONResponse({"detail": "缺少认证令牌"}, status_code=401)
                await response(scope, receive, send)
                return

            token = auth_header[7:]
            try:
                payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
                scope["user"] = payload
            except JWTError:
                response = JSONResponse({"detail": "令牌无效或已过期"}, status_code=401)
                await response(scope, receive, send)
                return

        await self.app(scope, receive, send)
