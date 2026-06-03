"""审计日志中间件 — 纯ASGI版本，避免BaseHTTPMiddleware嵌套问题"""
from starlette.types import ASGIApp, Scope, Receive, Send
from starlette.requests import Request
from starlette.responses import Response
from datetime import datetime
import json
import os

AUDIT_DIR = os.environ.get("WMS_AUDIT_DIR", "/var/log/wms/audit/")
os.makedirs(AUDIT_DIR, exist_ok=True)


class AuditLogMiddleware:
    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request = Request(scope)
        path = request.url.path
        if not path.startswith("/api/") or path == "/api/health":
            await self.app(scope, receive, send)
            return

        status_code = 500
        # Wrap send to capture status code
        async def send_wrapper(message):
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message["status"]
            await send(message)

        entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "method": request.method,
            "path": path,
            "query": str(request.url.query),
            "ip": request.client.host if request.client else "unknown",
        }

        try:
            await self.app(scope, receive, send_wrapper)
        except Exception as exc:
            entry["status_code"] = 500
            entry["error"] = str(exc)
            _write_log(entry)
            raise

        user = scope.get("user")
        entry["user_id"] = user.get("admin_id", "anonymous") if user else "anonymous"
        entry["user_name"] = user.get("admin_name", "anonymous") if user else "anonymous"
        entry["status_code"] = status_code
        _write_log(entry)


def _write_log(entry: dict):
    today = datetime.utcnow().strftime("%Y-%m-%d")
    log_path = os.path.join(AUDIT_DIR, f"{today}.jsonl")
    try:
        with open(log_path, "a") as f:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")
    except Exception:
        pass
