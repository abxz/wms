"""发票中心桥接层 — 通过HTTP转发请求到独立发票中心"""
from fastapi import APIRouter, HTTPException, Depends
from middleware.jwt_auth import JWTAuthMiddleware
import httpx
import os

router = APIRouter(prefix="/api/invoice-bridge", tags=["发票中心桥接"])
INVOICE_API = os.environ.get("INVOICE_CENTER_API", "http://localhost:5175/api")


def register(app):
    app.include_router(router)


def require_auth():
    """桥接层内部认证 — 复用JWT中间件逻辑"""
    from jose import jwt
    from fastapi import Request
    async def _check(request: Request):
        from middleware.jwt_auth import JWT_SECRET
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            raise HTTPException(401, "缺少认证令牌")
        token = auth_header[7:]
        try:
            jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        except Exception:
            raise HTTPException(401, "令牌无效或已过期")
    return _check


async def _forward(method: str, path: str, body: dict = None):
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.request(method, f"{INVOICE_API}{path}", json=body)
            return resp.json()
    except Exception as e:
        raise HTTPException(502, f"发票中心不可达: {e}")


@router.post("/reconcile")
async def reconcile(body: dict, _=Depends(require_auth)):
    return await _forward("POST", f"/parser/invoices/{body.get('invoice_number')}/reconcile",
                          {"inbound_id": body.get("inbound_id")})


@router.post("/audit")
async def audit(body: dict, _=Depends(require_auth)):
    return await _forward("POST", "/wms-bridge/audit", body)


@router.post("/audit/fix")
async def audit_fix(body: dict, _=Depends(require_auth)):
    return await _forward("POST", "/wms-bridge/audit/fix", body)


@router.post("/auto-match")
async def auto_match(body: dict, _=Depends(require_auth)):
    return await _forward("POST", "/wms-bridge/auto-match", body)
