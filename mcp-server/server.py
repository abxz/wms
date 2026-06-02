"""
WMS MCP Server — Streamable HTTP transport
所有 Agent 通过标准 MCP 协议接入 WMS 的全部核心功能

功能域：
  认证(auth)     — 登录/登出/刷新token
  商品(products)  — CRUD + SKU生成
  库存(inventory) — 查询/预警/调整
  入库(inbound)   — 创建/完成/列表/详情
  出库(outbound)  — 创建/完成/列表/详情
  员工(employees) — CRUD + 工号生成
  供应商(suppliers)— CRUD
  仓库(warehouses)— CRUD
  货位(locations) — CRUD
  仪表盘(dashboard)— 汇总/趋势
  发票(invoices)  — CRUD + 上传/匹配/对账
  条码(barcode)   — 生成/批量
  导入导出(import_export) — 模板/导出/导入
  备份(backup)    — 创建/列表/恢复/删除
  系统配置(config)— 读写
  主数据(master)  — 商品/供应商/员工主数据管理
  劳保(labor)     — 用品/配置/发放
  通知(notifications) — 已读/未读
"""

import asyncio
import httpx
from typing import Any
from mcp.server.fastmcp import FastMCP

# ── 配置 ──────────────────────────────────────────────
WMS_BASE_URL = "http://localhost:5174"
API_PREFIX = "/api"

mcp = FastMCP(
    name="wms",
    instructions=(
        "仓储管理系统(WMS) MCP 接入点。所有操作通过调用 WMS REST API 完成。"
        "写操作(inbound/outbound complete等)需先通过 auth_login 获取 token，"
        "后续请求自动携带 Authorization header。"
    ),
)

# ── HTTP 客户端 ────────────────────────────────────────
_client: httpx.AsyncClient | None = None
_token: str = ""


def _get_client() -> httpx.AsyncClient:
    global _client
    if _client is None:
        headers = {"Content-Type": "application/json"}
        if _token:
            headers["Authorization"] = f"Bearer {_token}"
        _client = httpx.AsyncClient(
            base_url=f"{WMS_BASE_URL}{API_PREFIX}",
            headers=headers,
            timeout=30.0,
        )
    return _client


async def _request(method: str, path: str, **kw) -> dict:
    """统一请求封装，自动处理错误"""
    c = _get_client()
    resp = await c.request(method, path, **kw)
    if resp.status_code >= 400:
        raise RuntimeError(f"WMS API {method} {path} → {resp.status_code}: {resp.text[:500]}")
    return resp.json()


async def _get(path: str, params: dict | None = None) -> dict:
    return await _request("GET", path, params=params)


async def _post(path: str, json: dict | None = None) -> dict:
    return await _request("POST", path, json=json)


async def _put(path: str, json: dict | None = None) -> dict:
    return await _request("PUT", path, json=json)


async def _delete(path: str) -> dict:
    return await _request("DELETE", path)


# ══════════════════════════════════════════════════════
#  认证域
# ══════════════════════════════════════════════════════

@mcp.tool(description="WMS 用户登录，获取 JWT token。成功后自动设置后续请求的认证头。参数: username, password")
async def auth_login(username: str, password: str) -> dict:
    global _token, _client
    resp = await _request("POST", "/login", json={"username": username, "password": password})
    _token = resp.get("token") or resp.get("access_token", "")
    if _token:
        # 重建 client 带上新 token
        _client = None
    return resp


@mcp.tool(description="刷新 JWT token")
async def auth_refresh() -> dict:
    global _token, _client
    resp = await _request("POST", "/auth/refresh")
    _token = resp.get("token") or resp.get("access_token", "")
    if _token:
        _client = None
    return resp


@mcp.tool(description="PDA 登录(手持终端)")
async def auth_pda_login(username: str, password: str) -> dict:
    return await _post("/pda-login", {"username": username, "password": password})


@mcp.tool(description="PDA 登出")
async def auth_pda_logout() -> dict:
    return await _post("/pda-logout")


@mcp.tool(description="PDA token 验证")
async def auth_pda_verify(token: str) -> dict:
    return await _post("/pda-verify", {"token": token})


# ══════════════════════════════════════════════════════
#  商品域
# ══════════════════════════════════════════════════════

@mcp.tool(description="分页查询商品列表。参数: page(默认1), size(默认20), search(搜索关键词), warehouse_id(仓库筛选)")
async def products_list(page: int = 1, size: int = 20, search: str = "", warehouse_id: str = "") -> dict:
    return await _get("/products", {"page": page, "size": size, "search": search, "warehouse_id": warehouse_id})


@mcp.tool(description="获取单个商品详情。参数: product_id")
async def products_get(product_id: str) -> dict:
    return await _get(f"/products/{product_id}")


@mcp.tool(description="创建商品。参数: body(dict) 含 name/category/unit/price 等字段")
async def products_create(body: dict) -> dict:
    return await _post("/products", body)


@mcp.tool(description="更新商品。参数: product_id, body(dict)")
async def products_update(product_id: str, body: dict) -> dict:
    return await _put(f"/products/{product_id}", body)


@mcp.tool(description="删除商品。参数: product_id")
async def products_delete(product_id: str) -> dict:
    return await _delete(f"/products/{product_id}")


@mcp.tool(description="生成下一个 SKU 编号。参数: category(分类), name(名称)")
async def products_next_sku(category: str = "", name: str = "") -> dict:
    return await _get("/products/next-sku", {"category": category, "name": name})


# ══════════════════════════════════════════════════════
#  库存域
# ══════════════════════════════════════════════════════

@mcp.tool(description="查询库存列表。参数: page, size, search")
async def inventory_list(page: int = 1, size: int = 20, search: str = "") -> dict:
    return await _get("/inventory", {"page": page, "size": size, "search": search})


@mcp.tool(description="获取库存预警列表(低于最小库存)")
async def inventory_alerts() -> dict:
    return await _get("/inventory/alerts")


@mcp.tool(description="按商品查库存。参数: product_id")
async def inventory_by_product(product_id: str) -> dict:
    return await _get(f"/inventory/by-product/{product_id}")


@mcp.tool(description="按货位查库存。参数: location_id")
async def inventory_by_location(location_id: str) -> dict:
    return await _get(f"/inventory/by-location/{location_id}")


@mcp.tool(description="调整库存数量。参数: body(dict) 含 inventory_id/quantity/reason 等")
async def inventory_adjust(body: dict) -> dict:
    return await _post("/inventory/adjust", body)


@mcp.tool(description="更新库存记录。参数: inv_id, body(dict)")
async def inventory_update(inv_id: str, body: dict) -> dict:
    return await _put(f"/inventory/{inv_id}", body)


# ══════════════════════════════════════════════════════
#  入库域
# ══════════════════════════════════════════════════════

@mcp.tool(description="查询入库单列表。参数: page, size, search")
async def inbound_list(page: int = 1, size: int = 20, search: str = "") -> dict:
    return await _get("/inbound", {"page": page, "size": size, "search": search})


@mcp.tool(description="获取入库单详情。参数: order_id")
async def inbound_get(order_id: str) -> dict:
    return await _get(f"/inbound/{order_id}")


@mcp.tool(description="创建入库单。参数: body(dict) 含 product_id/quantity/supplier_id/purchase_type/contract_no 等")
async def inbound_create(body: dict) -> dict:
    return await _post("/inbound", body)


@mcp.tool(description="完成入库(确认收货)。参数: order_id")
async def inbound_complete(order_id: str) -> dict:
    return await _put(f"/inbound/{order_id}/complete")


@mcp.tool(description="删除入库单。参数: order_id")
async def inbound_delete(order_id: str) -> dict:
    return await _delete(f"/inbound/{order_id}")


@mcp.tool(description="批量创建入库单。参数: body(list[dict])")
async def inbound_batch(body: list) -> dict:
    return await _post("/inbound/batch", body)


# ══════════════════════════════════════════════════════
#  出库域
# ══════════════════════════════════════════════════════

@mcp.tool(description="查询出库单列表。参数: page, size, search")
async def outbound_list(page: int = 1, size: int = 20, search: str = "") -> dict:
    return await _get("/outbound", {"page": page, "size": size, "search": search})


@mcp.tool(description="获取出库单详情。参数: order_id")
async def outbound_get(order_id: str) -> dict:
    return await _get(f"/outbound/{order_id}")


@mcp.tool(description="创建出库单。参数: body(dict) 含 product_id/quantity/warehouse_id/destination 等")
async def outbound_create(body: dict) -> dict:
    return await _post("/outbound", body)


@mcp.tool(description="完成出库(确认发货)。参数: order_id")
async def outbound_complete(order_id: str) -> dict:
    return await _put(f"/outbound/{order_id}/complete")


@mcp.tool(description="批量创建出库单。参数: body(list[dict])")
async def outbound_batch(body: list) -> dict:
    return await _post("/outbound/batch", body)


# ══════════════════════════════════════════════════════
#  员工域
# ══════════════════════════════════════════════════════

@mcp.tool(description="查询员工列表。参数: page, size, search")
async def employees_list(page: int = 1, size: int = 20, search: str = "") -> dict:
    return await _get("/employees", {"page": page, "size": size, "search": search})


@mcp.tool(description="获取员工详情。参数: employee_id")
async def employees_get(employee_id: str) -> dict:
    return await _get(f"/employees/{employee_id}")


@mcp.tool(description="创建员工。参数: body(dict) 含 name/position/job_type/phone 等")
async def employees_create(body: dict) -> dict:
    return await _post("/employees", body)


@mcp.tool(description="更新员工。参数: employee_id, body(dict)")
async def employees_update(employee_id: str, body: dict) -> dict:
    return await _put(f"/employees/{employee_id}", body)


@mcp.tool(description="删除员工。参数: employee_id")
async def employees_delete(employee_id: str) -> dict:
    return await _delete(f"/employees/{employee_id}")


@mcp.tool(description="生成下一个工号(格式 JS_ZS_001)")
async def employees_next_no() -> dict:
    return await _get("/employees/next-no")


@mcp.tool(description="重置员工额度。参数: employee_id")
async def employees_reset_quota(employee_id: str) -> dict:
    return await _post(f"/employees/{employee_id}/reset-quota")


@mcp.tool(description="查询员工申领记录。参数: employee_id")
async def employees_claims(employee_id: str) -> dict:
    return await _get(f"/employees/{employee_id}/claims")


@mcp.tool(description="员工申领。参数: body(dict) 含 employee_id/product_id/quantity 等")
async def employees_claim(body: dict) -> dict:
    return await _post("/employees/claim", body)


@mcp.tool(description="获取员工二维码。参数: employee_id")
async def employees_qrcode(employee_id: str) -> dict:
    return await _get(f"/employees/{employee_id}/qrcode")


# ══════════════════════════════════════════════════════
#  供应商域
# ══════════════════════════════════════════════════════

@mcp.tool(description="查询供应商列表。参数: page, size, search")
async def suppliers_list(page: int = 1, size: int = 20, search: str = "") -> dict:
    return await _get("/suppliers", {"page": page, "size": size, "search": search})


@mcp.tool(description="获取供应商详情。参数: supplier_id")
async def suppliers_get(supplier_id: str) -> dict:
    return await _get(f"/suppliers/{supplier_id}")


@mcp.tool(description="创建供应商。参数: body(dict) 含 name/contact/phone/address/contract_no 等")
async def suppliers_create(body: dict) -> dict:
    return await _post("/suppliers", body)


@mcp.tool(description="更新供应商。参数: supplier_id, body(dict)")
async def suppliers_update(supplier_id: str, body: dict) -> dict:
    return await _put(f"/suppliers/{supplier_id}", body)


@mcp.tool(description="删除供应商。参数: supplier_id")
async def suppliers_delete(supplier_id: str) -> dict:
    return await _delete(f"/suppliers/{supplier_id}")


# ══════════════════════════════════════════════════════
#  仓库域
# ══════════════════════════════════════════════════════

@mcp.tool(description="查询仓库列表。参数: page, size")
async def warehouses_list(page: int = 1, size: int = 20) -> dict:
    return await _get("/warehouses", {"page": page, "size": size})


@mcp.tool(description="获取所有仓库(不分页)")
async def warehouses_all() -> dict:
    return await _get("/warehouses/all")


@mcp.tool(description="获取仓库详情。参数: warehouse_id")
async def warehouses_get(warehouse_id: str) -> dict:
    return await _get(f"/warehouses/{warehouse_id}")


@mcp.tool(description="创建仓库。参数: body(dict) 含 name/address/manager 等")
async def warehouses_create(body: dict) -> dict:
    return await _post("/warehouses", body)


@mcp.tool(description="更新仓库。参数: warehouse_id, body(dict)")
async def warehouses_update(warehouse_id: str, body: dict) -> dict:
    return await _put(f"/warehouses/{warehouse_id}", body)


@mcp.tool(description="删除仓库。参数: warehouse_id")
async def warehouses_delete(warehouse_id: str) -> dict:
    return await _delete(f"/warehouses/{warehouse_id}")


# ══════════════════════════════════════════════════════
#  货位域
# ══════════════════════════════════════════════════════

@mcp.tool(description="查询货位列表")
async def locations_list(page: int = 1, size: int = 20) -> dict:
    return await _get("/locations", {"page": page, "size": size})


@mcp.tool(description="获取货位详情。参数: location_id")
async def locations_get(location_id: str) -> dict:
    return await _get(f"/locations/{location_id}")


@mcp.tool(description="创建货位。参数: body(dict) 含 code/warehouse_id/capacity 等")
async def locations_create(body: dict) -> dict:
    return await _post("/locations", body)


@mcp.tool(description="更新货位。参数: location_id, body(dict)")
async def locations_update(location_id: str, body: dict) -> dict:
    return await _put(f"/locations/{location_id}", body)


@mcp.tool(description="删除货位。参数: location_id")
async def locations_delete(location_id: str) -> dict:
    return await _delete(f"/locations/{location_id}")


@mcp.tool(description="查询货位使用历史")
async def locations_history() -> dict:
    return await _get("/locations/history/usage")


# ══════════════════════════════════════════════════════
#  仪表盘域
# ══════════════════════════════════════════════════════

@mcp.tool(description="获取仪表盘汇总数据(库存总量/今日出入库/预警数等)")
async def dashboard_summary() -> dict:
    return await _get("/dashboard/summary")


@mcp.tool(description="获取出入库趋势数据。参数: days(天数,默认30)")
async def dashboard_trends(days: int = 30) -> dict:
    return await _get("/dashboard/trends", {"days": days})


# ══════════════════════════════════════════════════════
#  发票域
# ══════════════════════════════════════════════════════

@mcp.tool(description="查询发票列表。参数: page, size, search")
async def invoices_list(page: int = 1, size: int = 20, search: str = "") -> dict:
    return await _get("/invoices", {"page": page, "size": size, "search": search})


@mcp.tool(description="获取发票详情。参数: invoice_id")
async def invoices_get(invoice_id: str) -> dict:
    return await _get(f"/invoices/{invoice_id}")


@mcp.tool(description="创建发票。参数: body(dict) 含 invoice_number/amount/supplier_id 等")
async def invoices_create(body: dict) -> dict:
    return await _post("/invoices", body)


@mcp.tool(description="更新发票。参数: invoice_id, body(dict)")
async def invoices_update(invoice_id: str, body: dict) -> dict:
    return await _put(f"/invoices/{invoice_id}", body)


@mcp.tool(description="删除发票。参数: invoice_id")
async def invoices_delete(invoice_id: str) -> dict:
    return await _delete(f"/invoices/{invoice_id}")


@mcp.tool(description="获取发票统计摘要")
async def invoices_stats_summary() -> dict:
    return await _get("/invoices/stats/summary")


@mcp.tool(description="发票对账。参数: invoice_number")
async def invoices_reconcile(invoice_number: str) -> dict:
    return await _post(f"/invoices/{invoice_number}/reconcile")


@mcp.tool(description="上传单张发票文件。参数: body(dict) 含 file_path/invoice_data 等")
async def invoices_upload(body: dict) -> dict:
    return await _post("/invoices/upload", body)


@mcp.tool(description="批量上传发票。参数: body(list[dict])")
async def invoices_upload_batch(body: list) -> dict:
    return await _post("/invoices/upload/batch", body)


@mcp.tool(description="解析发票(OCR/数据提取)。参数: body(dict)")
async def invoices_parse(body: dict) -> dict:
    return await _post("/invoices/parse", body)


@mcp.tool(description="自动匹配发票与入库单")
async def invoices_auto_match() -> dict:
    return await _post("/invoices/auto-match")


@mcp.tool(description="审核发票。参数: body(dict)")
async def invoices_audit(body: dict) -> dict:
    return await _post("/invoices/audit", body)


# ══════════════════════════════════════════════════════
#  发票桥接域 (WMS ↔ 发票中心)
# ══════════════════════════════════════════════════════

@mcp.tool(description="发票桥接对账。参数: body(dict)")
async def invoice_bridge_reconcile(body: dict) -> dict:
    return await _post("/invoice-bridge/reconcile", body)


@mcp.tool(description="发票桥接审核。参数: body(dict)")
async def invoice_bridge_audit(body: dict) -> dict:
    return await _post("/invoice-bridge/audit", body)


@mcp.tool(description="发票桥接自动匹配")
async def invoice_bridge_auto_match() -> dict:
    return await _post("/invoice-bridge/auto-match")


@mcp.tool(description="解析发票文件。参数: body(dict) 含 file_path")
async def invoice_bridge_parse(body: dict) -> dict:
    return await _post("/invoice-bridge/parse", body)


# ══════════════════════════════════════════════════════
#  发票分类器域
# ══════════════════════════════════════════════════════

@mcp.tool(description="运行发票分类器。参数: body(dict)")
async def invoice_classifier_process(body: dict) -> dict:
    return await _post("/invoice-classifier/process", body)


@mcp.tool(description="获取分类器配置")
async def invoice_classifier_config_get() -> dict:
    return await _get("/invoice-classifier/config")


@mcp.tool(description="设置分类器配置。参数: body(dict)")
async def invoice_classifier_config_set(body: dict) -> dict:
    return await _post("/invoice-classifier/config", body)


@mcp.tool(description="获取分类器统计")
async def invoice_classifier_stats() -> dict:
    return await _get("/invoice-classifier/stats")


# ══════════════════════════════════════════════════════
#  条码域
# ══════════════════════════════════════════════════════

@mcp.tool(description="生成条码。参数: body(dict) 含 data/type 等")
async def barcode_generate(body: dict) -> dict:
    return await _post("/barcode/generate", body)


@mcp.tool(description="生成二维码。参数: body(dict) 含 data/size 等")
async def barcode_qrcode(body: dict) -> dict:
    return await _post("/barcode/qrcode", body)


@mcp.tool(description="批量生成二维码。参数: body(list[dict])")
async def barcode_qrcode_batch(body: list) -> dict:
    return await _post("/barcode/qrcode/batch", body)


@mcp.tool(description="生成商品二维码。参数: product_id")
async def barcode_qrcode_product(product_id: str) -> dict:
    return await _post(f"/barcode/qrcode/product/{product_id}")


# ══════════════════════════════════════════════════════
#  导入导岀域
# ══════════════════════════════════════════════════════

@mcp.tool(description="下载主数据导入模板(Excel)")
async def import_export_template_main_data() -> dict:
    return await _get("/import-export/template/main-data")


@mcp.tool(description="下载员工导入模板(Excel)")
async def import_export_template_employees() -> dict:
    return await _get("/import-export/template/employees")


@mcp.tool(description="下载订单导入模板(Excel)")
async def import_export_template_orders() -> dict:
    return await _get("/import-export/template/orders")


@mcp.tool(description="导出商品数据(Excel)")
async def import_export_products() -> dict:
    return await _get("/import-export/export/products")


@mcp.tool(description="导出供应商数据(Excel)")
async def import_export_suppliers() -> dict:
    return await _get("/import-export/export/suppliers")


@mcp.tool(description="导出员工数据(Excel)")
async def import_export_employees() -> dict:
    return await _get("/import-export/export/employees")


@mcp.tool(description="导出库存数据(Excel)")
async def import_export_inventory() -> dict:
    return await _get("/import-export/export/inventory")


@mcp.tool(description="导入主数据(Excel)。参数: body(dict) 含 file_path/data 等")
async def import_export_import_main_data(body: dict) -> dict:
    return await _post("/import-export/main-data", body)


@mcp.tool(description="导入员工数据(Excel)。参数: body(dict)")
async def import_export_import_employees(body: dict) -> dict:
    return await _post("/import-export/employees", body)


@mcp.tool(description="导入订单数据(Excel)。参数: body(dict)")
async def import_export_import_orders(body: dict) -> dict:
    return await _post("/import-export/orders", body)


@mcp.tool(description="导入主数据商品。参数: body(dict)")
async def import_export_import_master_products(body: dict) -> dict:
    return await _post("/import-export/import/master-products", body)


@mcp.tool(description="导入主数据供应商。参数: body(dict)")
async def import_export_import_master_suppliers(body: dict) -> dict:
    return await _post("/import-export/import/master-suppliers", body)


@mcp.tool(description="导入主数据员工。参数: body(dict)")
async def import_export_import_master_employees(body: dict) -> dict:
    return await _post("/import-export/import/master-employees", body)


# ══════════════════════════════════════════════════════
#  备份域
# ══════════════════════════════════════════════════════

@mcp.tool(description="创建数据备份")
async def backup_create() -> dict:
    return await _post("/backup/create")


@mcp.tool(description="获取备份列表")
async def backup_list() -> dict:
    return await _get("/backup/list")


@mcp.tool(description="获取备份统计")
async def backup_stats() -> dict:
    return await _get("/backup/stats")


@mcp.tool(description="从备份恢复。参数: body(dict) 含 filename")
async def backup_restore(body: dict) -> dict:
    return await _post("/backup/restore", body)


@mcp.tool(description="删除备份文件。参数: filename")
async def backup_delete(filename: str) -> dict:
    return await _delete(f"/backup/{filename}")


# ══════════════════════════════════════════════════════
#  系统配置域
# ══════════════════════════════════════════════════════

@mcp.tool(description="获取系统配置")
async def system_config_get() -> dict:
    return await _get("/system-config/config")


@mcp.tool(description="更新系统配置。参数: body(dict)")
async def system_config_update(body: dict) -> dict:
    return await _put("/system-config/config", body)


# ══════════════════════════════════════════════════════
#  主数据管理域 (独立于商品/供应商/员工的另一套 CRUD)
# ══════════════════════════════════════════════════════

@mcp.tool(description="主数据-查询商品列表")
async def master_products_list(page: int = 1, size: int = 20) -> dict:
    return await _get("/master-data/products", {"page": page, "size": size})


@mcp.tool(description="主数据-获取商品详情。参数: product_id")
async def master_products_get(product_id: str) -> dict:
    return await _get(f"/master-data/products/{product_id}")


@mcp.tool(description="主数据-创建商品。参数: body(dict)")
async def master_products_create(body: dict) -> dict:
    return await _post("/master-data/products", body)


@mcp.tool(description="主数据-更新商品。参数: product_id, body(dict)")
async def master_products_update(product_id: str, body: dict) -> dict:
    return await _put(f"/master-data/products/{product_id}", body)


@mcp.tool(description="主数据-删除商品。参数: product_id")
async def master_products_delete(product_id: str) -> dict:
    return await _delete(f"/master-data/products/{product_id}")


@mcp.tool(description="主数据-查询供应商列表")
async def master_suppliers_list(page: int = 1, size: int = 20) -> dict:
    return await _get("/master-data/suppliers", {"page": page, "size": size})


@mcp.tool(description="主数据-获取供应商详情。参数: supplier_id")
async def master_suppliers_get(supplier_id: str) -> dict:
    return await _get(f"/master-data/suppliers/{supplier_id}")


@mcp.tool(description="主数据-创建供应商。参数: body(dict)")
async def master_suppliers_create(body: dict) -> dict:
    return await _post("/master-data/suppliers", body)


@mcp.tool(description="主数据-更新供应商。参数: supplier_id, body(dict)")
async def master_suppliers_update(supplier_id: str, body: dict) -> dict:
    return await _put(f"/master-data/suppliers/{supplier_id}", body)


@mcp.tool(description="主数据-删除供应商。参数: supplier_id")
async def master_suppliers_delete(supplier_id: str) -> dict:
    return await _delete(f"/master-data/suppliers/{supplier_id}")


@mcp.tool(description="主数据-查询员工列表")
async def master_employees_list(page: int = 1, size: int = 20) -> dict:
    return await _get("/master-data/employees", {"page": page, "size": size})


@mcp.tool(description="主数据-获取员工详情。参数: employee_id")
async def master_employees_get(employee_id: str) -> dict:
    return await _get(f"/master-data/employees/{employee_id}")


@mcp.tool(description="主数据-创建员工。参数: body(dict)")
async def master_employees_create(body: dict) -> dict:
    return await _post("/master-data/employees", body)


@mcp.tool(description="主数据-更新员工。参数: employee_id, body(dict)")
async def master_employees_update(employee_id: str, body: dict) -> dict:
    return await _put(f"/master-data/employees/{employee_id}", body)


@mcp.tool(description="主数据-删除员工。参数: employee_id")
async def master_employees_delete(employee_id: str) -> dict:
    return await _delete(f"/master-data/employees/{employee_id}")


# ══════════════════════════════════════════════════════
#  劳保域
# ══════════════════════════════════════════════════════

@mcp.tool(description="查询劳保用品列表")
async def labor_supplies_list(page: int = 1, size: int = 20) -> dict:
    return await _get("/labor-protection/supplies", {"page": page, "size": size})


@mcp.tool(description="查询所有劳保用品(不分页)")
async def labor_supplies_all() -> dict:
    return await _get("/labor-protection/supplies/all")


@mcp.tool(description="查询低库存劳保用品")
async def labor_supplies_low_stock() -> dict:
    return await _get("/labor-protection/supplies/low-stock")


@mcp.tool(description="创建劳保用品。参数: body(dict)")
async def labor_supplies_create(body: dict) -> dict:
    return await _post("/labor-protection/supplies", body)


@mcp.tool(description="更新劳保用品。参数: supply_id, body(dict)")
async def labor_supplies_update(supply_id: str, body: dict) -> dict:
    return await _put(f"/labor-protection/supplies/{supply_id}", body)


@mcp.tool(description="删除劳保用品。参数: supply_id")
async def labor_supplies_delete(supply_id: str) -> dict:
    return await _delete(f"/labor-protection/supplies/{supply_id}")


@mcp.tool(description="按岗位查劳保配置。参数: position")
async def labor_configs_by_position(position: str) -> dict:
    return await _get(f"/labor-protection/configs/position/{position}")


@mcp.tool(description="查询待发放列表")
async def labor_pending() -> dict:
    return await _get("/labor-protection/pending")


@mcp.tool(description="发放劳保用品。参数: body(dict)")
async def labor_distribute(body: dict) -> dict:
    return await _post("/labor-protection/distribute", body)


@mcp.tool(description="查询发放记录列表")
async def labor_distributions() -> dict:
    return await _get("/labor-protection/distributions")


# ══════════════════════════════════════════════════════
#  通知域
# ══════════════════════════════════════════════════════

@mcp.tool(description="查询通知列表")
async def notifications_list(page: int = 1, size: int = 20) -> dict:
    return await _get("/notifications", {"page": page, "size": size})


@mcp.tool(description="获取未读通知数量")
async def notifications_unread_count() -> dict:
    return await _get("/notifications/unread-count")


@mcp.tool(description="标记通知已读。参数: notification_id")
async def notifications_mark_read(notification_id: str) -> dict:
    return await _put(f"/notifications/{notification_id}/read")


@mcp.tool(description="标记全部已读")
async def notifications_mark_all_read() -> dict:
    return await _post("/notifications/mark-all-read")


# ══════════════════════════════════════════════════════
#  库存异动域
# ══════════════════════════════════════════════════════

@mcp.tool(description="查询库存异动记录")
async def stock_mutations_list(page: int = 1, size: int = 20) -> dict:
    return await _get("/stock-mutations", {"page": page, "size": size})


# ══════════════════════════════════════════════════════
#  PDA 同步域
# ══════════════════════════════════════════════════════

@mcp.tool(description="批量同步 PDA 数据。参数: body(dict)")
async def pda_sync_batch(body: dict) -> dict:
    return await _post("/pda-sync/sync/batch", body)


@mcp.tool(description="查询 PDA 同步状态")
async def pda_sync_status() -> dict:
    return await _get("/pda-sync/sync/status")


# ══════════════════════════════════════════════════════
#  Master Config 域 (部门/岗位/工种/角色)
# ══════════════════════════════════════════════════════

@mcp.tool(description="获取指定类型的主配置列表。参数: config_type(department/job_type/position/role)")
async def master_config_get(config_type: str) -> dict:
    return await _get(f"/master-config/{config_type}")


@mcp.tool(description="创建主配置项。参数: config_type, body(dict)")
async def master_config_create(config_type: str, body: dict) -> dict:
    return await _post(f"/master-config/{config_type}", body)


@mcp.tool(description="删除主配置项。参数: config_type, name")
async def master_config_delete(config_type: str, name: str) -> dict:
    return await _delete(f"/master-config/{config_type}/{name}")


# ══════════════════════════════════════════════════════
#  健康检查
# ══════════════════════════════════════════════════════

@mcp.tool(description="WMS 服务健康检查")
async def health_check() -> dict:
    c = _get_client()
    resp = await c.get("/health")
    return resp.json()


# ══════════════════════════════════════════════════════
#  启动入口
# ══════════════════════════════════════════════════════

def main():
    """Streamable HTTP 模式启动"""
    import os
    host = os.environ.get("MCP_HOST", "0.0.0.0")
    port = int(os.environ.get("MCP_PORT", "5175"))
    mcp.settings.host = host
    mcp.settings.port = port
    mcp.settings.streamable_http_path = "/mcp"
    print(f"[WMS MCP] Starting on {host}:{port}/mcp (streamable-http)")
    mcp.run(transport="streamable-http")


if __name__ == "__main__":
    main()
