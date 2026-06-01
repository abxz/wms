"""审计日志中间件 — 自动记录所有API操作"""
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from datetime import datetime
import json
import os

AUDIT_DIR = os.environ.get("WMS_AUDIT_DIR", "/var/log/wms/audit/")
os.makedirs(AUDIT_DIR, exist_ok=True)

class AuditLogMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # 只审计业务API（非静态/健康检查）
        if not request.url.path.startswith("/api/") or request.url.path == "/api/health":
            return await call_next(request)
        
        # 记录请求
        user = getattr(request.state, "user", None)
        entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "user_id": user.get("admin_id", "anonymous") if user else "anonymous",
            "user_name": user.get("admin_name", "anonymous") if user else "anonymous",
            "method": request.method,
            "path": request.url.path,
            "query": str(request.url.query),
            "ip": request.client.host if request.client else "unknown",
        }
        
        try:
            response = await call_next(request)
            entry["status_code"] = response.status_code
        except Exception as exc:
            entry["status_code"] = 500
            entry["error"] = str(exc)
            today = datetime.utcnow().strftime("%Y-%m-%d")
            log_path = os.path.join(AUDIT_DIR, f"{today}.jsonl")
            try:
                with open(log_path, "a") as f:
                    f.write(json.dumps(entry, ensure_ascii=False) + "\n")
            except Exception:
                pass
            raise

        # 异步追加写入（当日文件）
        today = datetime.utcnow().strftime("%Y-%m-%d")
        log_path = os.path.join(AUDIT_DIR, f"{today}.jsonl")
        try:
            with open(log_path, "a") as f:
                f.write(json.dumps(entry, ensure_ascii=False) + "\n")
        except Exception:
            pass  # 审计日志不应影响业务
        
        return response
