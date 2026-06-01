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

app = FastAPI(title="仓储管理系统", version="2.1")

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

# 审计日志中间件
app.add_middleware(AuditLogMiddleware)

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


@app.get("/api/health")
def health():
    return {"status": "ok", "version": "2.1"}
