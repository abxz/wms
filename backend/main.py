"""仓储管理系统 - FastAPI 注册中心"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from middleware.jwt_auth import JWTAuthMiddleware
from middleware.audit_log import AuditLogMiddleware
from middleware.encrypt import init_crypto
import models  # registers ORM models into _TABLE_MODEL
from core.database import Base, engine

Base.metadata.create_all(bind=engine)

# Auto-migration: add missing columns for existing tables
try:
    from sqlalchemy import text
    with engine.connect() as _conn:
        _conn.execute(text("ALTER TABLE inbound ADD COLUMN IF NOT EXISTS purchase_type VARCHAR(32) DEFAULT ''"))
        _conn.execute(text("ALTER TABLE inbound ADD COLUMN IF NOT EXISTS contract_no VARCHAR(64) DEFAULT ''"))
        _conn.execute(text("ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS contract_no VARCHAR(64) DEFAULT ''"))
        _conn.execute(text("ALTER TABLE employees ADD COLUMN IF NOT EXISTS job_type VARCHAR(64) DEFAULT ''"))
        _conn.execute(text("ALTER TABLE inventory ADD COLUMN IF NOT EXISTS min_stock DOUBLE PRECISION DEFAULT 0"))
        _conn.execute(text("ALTER TABLE inventory ADD COLUMN IF NOT EXISTS max_stock DOUBLE PRECISION DEFAULT 999999"))
        _conn.commit()
except Exception:
    pass  # table may not exist yet on first run

app = FastAPI(title="仓储管理系统", version="2.1")


@app.on_event("startup")
async def _cleanup_orphan_inventory():
    """启动时清理孤儿 inventory 记录（product_id 不存在或为空的）"""
    try:
        from core.database import all_, delete as db_delete
        product_ids = {p["id"] for p in all_("products")}
        orphans = [
            inv for inv in all_("inventory")
            if not inv.get("product_id") or inv["product_id"] not in product_ids
        ]
        for inv in orphans:
            db_delete("inventory", inv["id"])
        if orphans:
            print(f"[startup] 已清理 {len(orphans)} 条孤儿 inventory 记录")
    except Exception as e:
        print(f"[startup] 孤儿 inventory 清理失败: {e}")

# CORS —— 前端 :3000 调用
_cors_origins = os.environ.get("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# JWT认证中间件（保护PDAPI接口）
app.add_middleware(JWTAuthMiddleware)

# 审计日志中间件（暂禁用 — BaseHTTPMiddleware嵌套导致HTTP状态码异常）
# app.add_middleware(AuditLogMiddleware)

# 初始化加密模块
init_crypto()

# ── 按需挂载模块 ──
from modules.products import register as reg_products
from modules.locations import register as reg_locations
from modules.suppliers import register as reg_suppliers
from modules.employees import register as reg_employees
from modules.inventory import register as reg_inventory
from modules.inbound import register as reg_inbound
from modules.outbound import register as reg_outbound
from modules.invoices import register as reg_invoices
from modules.barcode import register as reg_barcode
from modules.dashboard import register as reg_dashboard
from modules.warehouses import register as reg_warehouses
from modules.auth import register as reg_auth
from modules.system_config import register as reg_config
from modules.stock_mutations import register as reg_mutations
from modules.import_export import register as reg_import
from modules.pda_sync import register as reg_pda_sync
from modules.invoice_bridge import register as reg_invoice_bridge
from modules.invoice_classifier import register as reg_invoice_classifier
from modules.master_data import register as reg_master_data
from modules.backup import register as reg_backup
from modules.labor_protection import register as reg_labor
from modules.notifications import register as reg_notifications
from modules.master_config import register as reg_master_config

reg_products(app)
reg_locations(app)
reg_suppliers(app)
reg_employees(app)
reg_inventory(app)
reg_inbound(app)
reg_outbound(app)
reg_invoices(app)
reg_barcode(app)
reg_dashboard(app)
reg_warehouses(app)
reg_auth(app)
reg_config(app)
reg_mutations(app)
reg_import(app)
reg_pda_sync(app)
reg_invoice_bridge(app)
reg_invoice_classifier(app)
reg_master_data(app)
reg_backup(app)
reg_labor(app)
reg_notifications(app)
reg_master_config(app)


@app.get("/api/health")
def health():
    return {"status": "ok", "version": "2.1"}


# Debug interfaces removed for production security
