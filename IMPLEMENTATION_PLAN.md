# 仓储管理系统（WMS）· 模块化实现规划 v2.0

> 版本：v2.0 | 状态：规划中
> 技术栈：React + TypeScript + Tailwind | FastAPI + JSON文件存储
> 设计原则：模块化 · 移动优先 · 可独立部署

---

## 一、架构总览

```
warehouse-wms/
├── backend/                    # FastAPI 后端
│   ├── main.py                 # 注册中心（按需挂载模块）
│   ├── core/                   # 核心基础设施
│   │   ├── database.py         # JSON 存储引擎
│   │   ├── config.py           # 配置
│   │   └── utils.py            # 工具函数
│   ├── modules/                # 功能模块（每个独立、可插拔）
│   │   ├── products/           # 商品管理模块
│   │   │   ├── __init__.py     # router + 注册
│   │   │   ├── model.py        # 数据模型
│   │   │   ├── service.py      # 业务逻辑
│   │   │   └── schema.py       # 请求/响应Schema
│   │   ├── inventory/          # 库存模块
│   │   ├── inbound/            # 入库模块
│   │   ├── outbound/           # 出库模块
│   │   ├── suppliers/          # 供应商模块
│   │   ├── invoices/           # 发票模块
│   │   ├── employees/          # 员工领用模块
│   │   ├── locations/          # 库位模块
│   │   ├── dashboard/          # 数据面板模块
│   │   └── barcode/            # 条码/二维码模块
│   └── data/                   # JSON 数据存储
├── frontend/                   # React 前端
│   ├── src/
│   │   ├── App.tsx             # 路由注册中心
│   │   ├── pages/              # 页面模块（每个独立可单独调用）
│   │   │   ├── Dashboard/
│   │   │   ├── Products/
│   │   │   ├── Inbound/
│   │   │   ├── Outbound/
│   │   │   ├── Inventory/
│   │   │   ├── Suppliers/
│   │   │   ├── Invoices/
│   │   │   ├── Employees/
│   │   │   └── Locations/
│   │   ├── components/         # 通用组件
│   │   │   ├── Layout/         # 外壳
│   │   │   ├── BarcodeScanner/ # 扫码组件（移动端核心）
│   │   │   ├── DataTable/      # 通用表格
│   │   │   └── MobileNav/      # 移动端底部导航
│   │   └── services/
│   │       └── api.ts          # API 调用
│   └── package.json
└── README.md
```

---

## 二、模块化设计详解

### 2.1 后端模块规范

每个模块遵循统一接口：

```python
# modules/products/__init__.py
from fastapi import APIRouter

router = APIRouter(prefix="/api/products", tags=["商品管理"])

def register(app):
    """模块注册函数——在main.py中统一调用"""
    app.include_router(router)
```

模块间**解耦**：
- 库存模块读取商品模块数据，但通过 `service.py` 调用，不直接跨模块 import
- 出入库自动更新库存，通过 `inventory.service.update_stock()` 调用
- 每个模块可独立增删，不影响其他模块

### 2.2 前端模块规范

页面按文件夹隔离：

```
pages/Products/
├── index.tsx          # 页面入口
├── ProductList.tsx    # 列表
├── ProductForm.tsx    # 新增/编辑表单
├── ProductDetail.tsx  # 详情
└── types.ts           # 本页类型定义
```

路由懒加载：
```typescript
const Products = React.lazy(() => import('./pages/Products'));
```

每个页面可独立调用——通过 URL 参数直接跳转，或嵌入其他系统 iframe。

---

## 三、移动端重点优化

### 3.1 设计原则

| 原则 | 说明 |
|------|------|
| 📱 移动优先 | 先设计手机版，再适配桌面 |
| 🎯 扫码即用 | 打开页面第一件事就是扫码 |
| 🖐️ 触屏友好 | 按钮 ≥ 44px，间距充足 |
| ⚡ 轻量加载 | 首屏 < 100KB，lazy load 其他 |
| 📶 离线友好 | 关键数据本地缓存 |

### 3.2 移动端交互流程

```
打开 → 默认进入「扫码」界面
  └─ 扫商品条码 → 查看库存 / 快速入库 / 快速出库
  └─ 扫员工码 → 员工领用界面
  └─ 扫库位码 → 该库位库存列表

底部导航（MobileNav）：
  [📷 扫码] [📦 库存] [📋 出入库] [📊 面板] [👤 我的]
```

### 3.3 关键移动端功能

| 功能 | 移动端实现 |
|------|-----------|
| **扫码** | 直接调用摄像头，全屏扫码界面，自动识别后跳转 |
| **快速入库** | 扫条码 → 输入数量 → 确认，3步完成 |
| **快速出库** | 扫条码 → 确认 → 扣库存，2步完成 |
| **员工领用** | 扫员工码 → 扫商品 → 确认领用 |
| **库存查询** | 搜索/扫码 → 实时显示库存 + 库位 |
| **数据面板** | 精简卡片式布局，关键指标一目了然 |

### 3.4 响应式断点

| 断点 | 布局 | 导航 |
|:----:|------|------|
| < 640px | 单列、全屏 | 底部Tab导航 |
| 640-1024px | 双列、侧栏收起 | 顶部+折叠菜单 |
| > 1024px | 多列、侧栏展开 | 左侧导航 |

---

## 四、完整功能清单

| # | 模块 | 功能 | 关键移动端 | 说明 |
|:--:|------|------|:--------:|------|
| 1 | **商品管理** | CRUD、SKU、单价、分类、条码 | 扫码查商品 | 支持批量导入导出 |
| 2 | **库存管理** | 实时库存、预警、库位绑定 | 扫码查库存 | 支持移动盘点 |
| 3 | **入库单** | 创建、扫码录入、完成入库 | 3步扫码入库 | 关联供应商/发票 |
| 4 | **出库单** | 创建、扫码出库、完成 | 2步扫码出库 | 支持员工领用 |
| 5 | **供应商** | CRUD、联系方式、历史单据 | 查供应商 | 关联商品 |
| 6 | **发票** | 录入、关联入库单、整理 | 拍照/上传 | 按供应商/日期筛选 |
| 7 | **员工领用** | 二维码领用、月度限额 | 🌟 扫员工码→扫商品 | 定期领用场景 |
| 8 | **库位管理** | 编码、绑定商品、位置跟踪 | 扫码看库位 | 可选标签打印 |
| 9 | **数据面板** | 总览、月度趋势、预警卡片 | 精简卡片式 | 移动端关键指标 |

---

## 五、关键数据模型

```python
# ── 商品 ──
class Product(BaseModel):
    id: str = ""
    sku: str = ""                    # SKU 编码
    name: str                        # 商品名称
    category: str = ""               # 分类
    unit: str = "个"                 # 单位
    price: float = 0                 # 单价
    barcode: str = ""                # 条码号
    supplier_id: str = ""            # 供应商ID
    location_id: str = ""            # 默认库位
    min_stock: float = 0             # 最低库存预警
    max_stock: float = 999999        # 最高库存预警
    remark: str = ""
    active: bool = True

# ── 库存 ──
class Inventory(BaseModel):
    id: str
    product_id: str
    quantity: float = 0
    location_id: str = ""

# ── 入库单 ──
class InboundOrder(BaseModel):
    id: str
    order_no: str                    # 单号（自动生成）
    items: list[OrderItem]           # [{product_id, quantity, price}]
    supplier_id: str = ""
    invoice_id: str = ""
    total_amount: float = 0
    status: str = "pending"          # pending / completed / cancelled
    remark: str = ""

# ── 出库单 ──
class OutboundOrder(BaseModel):
    id: str
    order_no: str
    items: list[OrderItem]
    type: str = "normal"             # normal / employee_claim
    employee_id: str = ""
    status: str = "pending"
    remark: str = ""

# ── 供应商 ──
class Supplier(BaseModel):
    id: str
    name: str
    contact: str = ""
    phone: str = ""
    address: str = ""
    remark: str = ""

# ── 发票 ──
class Invoice(BaseModel):
    id: str
    invoice_no: str                  # 发票号码
    amount: float = 0
    supplier_id: str = ""
    inbound_order_id: str = ""
    date: str = ""
    image_path: str = ""             # 发票图片路径
    remark: str = ""

# ── 员工 ──
class Employee(BaseModel):
    id: str
    name: str
    employee_no: str                 # 工号
    department: str = ""
    qr_code: str = ""                # 二维码标识（用工号生成）
    monthly_quota: float = 1000      # 月度额度（金额）
    monthly_used: float = 0          # 已用额度
    active: bool = True

# ── 库位 ──
class Location(BaseModel):
    id: str
    code: str                        # 库位编码 e.g. A-01-01
    area: str = ""                   # 区域
    description: str = ""

# ── 出入库条目 ──
class OrderItem(BaseModel):
    product_id: str
    quantity: float
    price: float = 0
```

---

## 六、API 接口速览

| 模块 | 端点 | 说明 |
|------|------|------|
| **商品** | `GET/POST /api/products` | 列表（分页+搜索）/ 新增 |
| | `GET/PUT/DELETE /api/products/{id}` | 详情 / 编辑 / 删除 |
| | `POST /api/products/import` | 批量导入 Excel |
| | `GET /api/products/export` | 批量导出 Excel |
| **库存** | `GET /api/inventory` | 库存列表 |
| | `GET /api/inventory/alerts` | 预警列表 |
| | `GET /api/inventory/by-product/{pid}` | 单品库存 |
| | `GET /api/inventory/by-location/{lid}` | 库位库存 |
| | `POST /api/inventory/adjust` | 盘点调整 |
| **入库** | `GET/POST /api/inbound` | 列表 / 创建 |
| | `PUT /api/inbound/{id}/complete` | 完成入库（自动加库存） |
| | `DELETE /api/inbound/{id}` | 取消 |
| **出库** | `GET/POST /api/outbound` | 列表 / 创建 |
| | `PUT /api/outbound/{id}/complete` | 完成出库（自动减库存） |
| | `DELETE /api/outbound/{id}` | 取消 |
| **供应商** | `GET/POST/PUT/DELETE /api/suppliers` | CRUD |
| **发票** | `GET/POST/PUT/DELETE /api/invoices` | CRUD |
| **员工** | `GET/POST/PUT/DELETE /api/employees` | CRUD |
| | `POST /api/employees/{id}/reset-quota` | 重置月度额度 |
| **领用** | `POST /api/employees/claim` | 员工扫码领用（自动减库存+扣额度） |
| | `GET /api/employees/{id}/claims` | 领用记录 |
| **库位** | `GET/POST/PUT/DELETE /api/locations` | CRUD |
| **数据面板** | `GET /api/dashboard/summary` | 总览数据 |
| | `GET /api/dashboard/trends` | 月度趋势 |
| **条码** | `POST /api/barcode/generate` | 生成条码图片 |
| | `POST /api/qrcode/generate` | 生成二维码图片 |

---

## 七、模块依赖关系

```
products ───→ inventory ───→ inbound ───→ invoices
  │               │              │
  │               │              └──→ suppliers
  │               │
  └──→ locations  └──→ outbound ───→ employees
                         │
                         └──→ employees.claim
```

- 箭头方向为依赖方向
- 所有模块通过 `service` 层调用，不直接操作其他模块的数据文件
- 解耦核心：库存变更只由 `inventory.service.update_stock()` 触发

---

## 八、开发顺序

| 顺序 | 模块 | 原因 |
|:---:|------|------|
| 1 | **core**（database + config） | 基础设施 |
| 2 | **products** + **locations** | 基础数据 |
| 3 | **inventory** | 依赖商品+库位 |
| 4 | **suppliers** | 独立模块 |
| 5 | **inbound** + **invoices** | 入库更新库存 |
| 6 | **outbound** | 出库更新库存 |
| 7 | **employees** + claim | 领用场景 |
| 8 | **dashboard** | 汇总数据 |
| 9 | **barcode** + **qrcode** | 扫码能力 |
| 10 | **frontend** 全部页面 | 一次性构建 |

---

## 九、部署方式

```
端口 5174 → FastAPI 后端（独立运行）
端口 3000 → React 前端（独立运行，通过 webpack proxy 调 API）
```

```bash
# 后端
cd backend && uvicorn main:app --host 0.0.0.0 --port 5174

# 前端
cd frontend && npm run dev    # :3000 → 代理到 :5174
```

---

## 十、模块独立性示例

```python
# main.py - 注册中心：按需挂载模块
from modules.products import register as reg_products
from modules.inventory import register as reg_inventory
# ... 想加就加，想去就去

def create_app():
    app = FastAPI(title="仓储管理系统")
    reg_products(app)
    reg_inventory(app)
    # ...
    return app
```

```typescript
// App.tsx - 前端路由注册中心
const routes = [
  { path: '/products', component: React.lazy(() => import('./pages/Products')) },
  { path: '/inventory', component: React.lazy(() => import('./pages/Inventory')) },
  // 每个页面独立打包，按需加载
];
```

---

## 十一、技术依赖

| 依赖 | 用途 | 安装 |
|------|------|------|
| fastapi + uvicorn | 后端框架 | pip install fastapi uvicorn |
| python-barcode | 条码生成 | pip install python-barcode |
| qrcode | 二维码生成 | pip install qrcode[pil] |
| openpyxl | Excel 导入导出 | pip install openpyxl |
| python-multipart | 文件上传 | pip install python-multipart |
| react 18 | 前端框架 | npm install react react-dom |
| react-router-dom 6 | 路由 | npm install react-router-dom |
| tailwindcss | 样式 | npm install tailwindcss |
| html5-qrcode | 扫码 | npm install html5-qrcode |
| xlsx | 前端导入导出 | npm install xlsx |
| recharts | 图表 | npm install recharts |
| lucide-react | 图标 | npm install lucide-react |
