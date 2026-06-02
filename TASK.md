# WMS 修复任务书 — 2026-06-01

## 问题1：发票解析返回 {"detail":"需要登录"}

**根因**：发票中心后端的 `/api/parser/parse` 使用了 `require_auth` 依赖注入（`invoice-center/backend/middleware/auth.py:72`），要求 Bearer token。WMS 前端调用时未附带 JWT token。

JWT 密钥三项目共享（`/root/.hermes/shared/jwt.key`），WMS 登录返回的 token 发票中心可以识别。

**修复方案**：
在 WMS 的 `backend/modules/invoice_bridge/__init__.py` 中新增 `/api/invoice-bridge/parse` 端点，代理转发到发票中心的 `/api/parser/parse`。这样：
- WMS 前端已有 JWT token，调用 WMS 的 bridge 端点
- WMS 的 JWT 中间件保护 bridge 端点
- bridge 内部转发到发票中心（无需再传 token，内网调用）

同时，JWT 中间件白名单需确保 `/api/invoice-bridge/` 不在 PUBLIC_PATH_PREFIXES 中（它不应该公开）。

**具体改动** — `backend/modules/invoice_bridge/__init__.py`：

在现有 reconcile/audit/audit_fix/auto_match 之后，添加：

```python
@router.post("/parse")
async def parse(body: dict, _=Depends(require_auth)):
    """转发发票解析请求到发票中心"""
    return await _forward("POST", "/parser/parse", body)
```

---

## 问题2：新增仓库/供应商 Internal Server Error（以及其他模块相同问题）

**根因**：数据库层已从 JSON 文件迁移到 PostgreSQL（`core/database.py`），ORM 模型注册的表名是无 `.json` 后缀的（如 `"warehouses"`、`"suppliers"`）。但各个 service 文件中仍使用旧 JSON 文件名（如 `"warehouses.json"`）调用 `all_()`、`add()`、`update()` 等函数，导致 `_TABLE_MODEL` 查找失败 → `KeyError` → 500。

**修复方案**：将所有 `all_("xxx.json")` 和 `FILE = "xxx.json"` 改为无后缀的表名（`"xxx"`）。

**注意区分**：
- `CONFIG_FILE` / `SYNC_LOG_FILE` 是真实文件路径，保留 `.json`
- `classifier_config.json` / `collector_config.json` 也是真实文件，保留
- 只改传给 `all_()` `add()` `update()` `delete()` `get_by_id()` `paginate()` `query()` 等数据库函数的字符串

### 需修改的文件：

**1. `backend/modules/warehouses/service.py`**
```
FILE = "warehouses.json"  →  FILE = "warehouses"
products = all_("products.json")  →  all_("products")
```
同时检查 `backend/modules/warehouses/model.py:2`
```
WAREHOUSE_FILE = "warehouses.json"  →  (检查是否被使用，如仅定义未使用则不用改)
```

**2. `backend/modules/suppliers/service.py`**
```
FILE = "suppliers.json"  →  FILE = "suppliers"
```

**3. `backend/modules/products/service.py`**
```
FILE = "products.json"  →  FILE = "products"
```

**4. `backend/modules/inventory/service.py`**（2处）
```
FILE = "inventory.json"  →  FILE = "inventory"
products = ... all_("products.json")  →  all_("products")
```

**5. `backend/modules/inbound/service.py`**
```
FILE = "inbound.json"  →  FILE = "inbound"
```

**6. `backend/modules/outbound/service.py`**（2处）
```
OUTFILE = "outbound.json"  →  OUTFILE = "outbound"
INVFILE = "inventory.json"  →  INVFILE = "inventory"
```

**7. `backend/modules/employees/service.py`**（2处）
```
EMPFILE = "employees.json"  →  EMPFILE = "employees"
CLAIMFILE = "claims.json"  →  CLAIMFILE = "claims"
```

**8. `backend/modules/invoices/service.py`**（4处）
```
FILE = "invoices.json"  →  FILE = "invoices"
products = all_("products.json")  →  all_("products")
inbounds = all_("inbound.json")  →  all_("inbound")
update("products.json", pid, ...)  →  update("products", ...)
```

**9. `backend/modules/invoices/__init__.py`**（1处）
```
inbounds = all_("inbound.json")  →  all_("inbound")
```

**10. `backend/modules/dashboard/__init__.py`**（8处）
```
inbound = all_("inbound.json")  →  all_("inbound")   (2处)
outbound = all_("outbound.json")  →  all_("outbound")  (2处)
invoices = all_("invoices.json")  →  all_("invoices")
employees = all_("employees.json")  →  all_("employees")
all_("suppliers.json")  →  all_("suppliers")
all_("locations.json")  →  all_("locations")
```

**11. `backend/modules/products/__init__.py`**（1处）
```
all_("invoices.json")  →  all_("invoices")
```

**12. `backend/modules/barcode/__init__.py`**（1处）
```
get_by_id("products.json", ...)  →  get_by_id("products", ...)
```

**13. `backend/modules/locations/service.py`**（1处）
```
FILE = "locations.json"  →  FILE = "locations"
```

**14. `backend/modules/locations/__init__.py`**（1处）
```
all_("outbound.json")  →  all_("outbound")
```

---

## 验证方式

修复后：
1. 重启 WMS 后端
2. 登录 `admin / 123`
3. 测试新增仓库 → 应返回 201
4. 测试新增供应商 → 应返回 201
5. 测试发票上传+解析 → 应正常解析不报 401
6. 测试其他模块（入库、出库、员工、商品等）→ 创建操作正常
