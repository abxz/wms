# Phase 2~3 · 前端任务 · 都水司（香港Claude Code）

## 项目信息
- **工作目录:** `/root/projects/warehouse-wms/frontend`
- **后端API:** `http://185.x.x.x:5174`（北京服务器）
- **构建命令:** `npm run build`（webpack）
- **PDA型号:** 东集小码哥 CRUISE GeP（Android 16, 5.5寸 720P, Chrome浏览器）
- **扫码方式:** HID Keyboard模式（扫码键→键盘输入+Enter）

## 现有API清单（与前端相关）

### Products
- `GET /api/products` — 商品列表（search参数支持按name/sku/barcode/category/spec/invoice_number搜索）
- `GET /api/products/{id}` — 商品详情
- `POST /api/products` — 创建（自动生成qr_uuid）
- `PUT /api/products/{id}` — 更新
- `DELETE /api/products/{id}` — 删除

### Employees
- `GET /api/employees` — 员工列表（search参数支持按name/employee_no/department/role搜索）
- `GET /api/employees/{id}` — 详情
- `POST /api/employees` — 创建（自动生成 QR-EMP-{id}）
- `PUT /api/employees/{id}` — 更新（支持设role）
- `DELETE /api/employees/{id}` — 删除

### Auth
- `POST /api/auth/pda-login` — 扫码登录 `{"qr_code":"QR-EMP-xxx"}` → 返回 `{"token","admin_id","admin_name","role"}`
- `POST /api/auth/pda-logout` — `{"token":"xxx"}` → `{"ok":true}`
- `POST /api/auth/pda-verify` — `{"token":"xxx"}` → 返回session信息或401

### Inbound
- `GET /api/inbound` — 入库单列表
- `POST /api/inbound` — 创建 `{"items":[...], "supplier_name":"...", "admin_name":"...", "invoice_no":"..."}`
- `PUT /api/inbound/{id}/complete` — 完成入库（自动增库存）
- `DELETE /api/inbound/{id}` — 删除

### Outbound
- `GET /api/outbound` — 出库单列表
- `POST /api/outbound` — 创建 `{"items":[...], "claimer_name":"...", "admin_name":"...", "usage_location":"...", "invoice_no":"..."}`
- `PUT /api/outbound/{id}/complete` — 完成出库（原子扣减）
- `DELETE /api/outbound/{id}` — 删除

### QR/Barcode
- `POST /api/barcode/generate` — 生成条码
- `POST /api/barcode/qrcode` — 生成二维码图片 `{"data":"QR-PROD-xxx"}` → 返回图片路径
- `POST /api/barcode/qrcode/batch` — 批量生成ZIP

### Locations
- `GET /api/locations/history/usage` — 历史使用地点Combobox数据源 `{"items":["3号车间","仓库A",...]}`

### System Config
- `GET /api/system/config` — 获取系统配置 `{"inbound_current_no":"IN-0001","outbound_current_no":"OUT-0001","max_items_per_order":7}`
- `PUT /api/system/config` — 更新配置

### Stock Mutations
- `GET /api/stock-mutations` — 库存变动审计日志

## 任务清单

### 1. 通用修改
**Products.tsx** — 表格加「发票号码」列（最后列），搜索支持 invoice_number
**Employees.tsx** — 表格加「角色」列（super_admin/admin/claimer中文显示），支持按角色搜索

### 2. 二维码管理页（QrCodes.tsx）
路由: `/qrcodes`
- 展示所有产品二维码列表
- 列：产品名称/规格、QR编码（QR-PROD-xxx）、二维码预览（小图，调 `/api/barcode/qrcode` 生成）、生成日期
- 「批量生成」按钮：调 `/api/barcode/qrcode/batch`
- 「批量下载ZIP」按钮：调 `/api/barcode/qrcode/batch` 下载
- 搜索过滤：按产品名/编码搜索

### 3. PDA 登录页（PdaLogin.tsx）
路由: `/pda-login`
- 大号文字「请扫码登录」
- 自动 focus 扫码输入框
- 扫码 → `POST /api/auth/pda-login` → 成功→跳转PDA工作页
- 失败→提示「未授权的二维码」
- token 存 localStorage

### 4. PDA 扫码核心组件（OrderScanner.tsx）
通用扫码组件，PDA出库/入库页共用：
- 扫码输入框：自动 focus，扫码后自动触发查询，300ms去抖
- onChange 监听（非 onKeyDown），防误触
- 扫码后调对应 API
- 扫码结果回填界面
- 扫码后自动 refocus

### 5. PDA 出库页（PdaOutbound.tsx）
路由: `/pda/outbound`
流程：
1. 管理员已登录（从 localStorage 读 token）
2. 扫领料人二维码 → 显示「领料人：张三」
3. 扫商品二维码 → 查库存 → 自动填充名称/规格/库存
4. 再扫同商品 → 数量+1（不重复加行）
5. 扫不同商品 → 新增一行
6. 满7行 → 弹窗提示「已满7个，将拆单」
7. 手动改数量（+-按钮或直接输入）
8. 使用地点：Combobox（调 `/api/locations/history/usage`）+ 手动输入
9. 一次性提交所有子单

### 6. PDA 入库页（PdaInbound.tsx）
路由: `/pda/inbound`
流程：
1. 管理员已登录
2. 扫商品二维码（已有）→ 自动填充名称/规格，数量+1
3. 扫商品二维码（不存在）→ 弹窗模态框录入名称/规格
4. 满7行 → 拆单
5. 选择/输入供应商
6. 提交→库存增加

### 7. 使用地点 Combobox（LocationCombo.tsx）
- 下拉列表：调 `/api/locations/history/usage`
- 可手动输入新地点
- 新地点自动记录，下次出现在下拉

### 8. 离线缓存层
**PWA/Service Worker**（service-worker.js）：
- 缓存 HTML/CSS/JS 页面资源
- 手动注册：`navigator.serviceWorker.register('/service-worker.js')`
- 版本更新时 `skipWaiting()` + `clients.claim()`

**IndexedDB 离线存储**（offline-db.ts）：
- `db.products` — 缓存最近2000个商品（每次在线时增量同步）
- `db.employees` — 缓存全部员工
- `db.outboundQueue` — 离线出库待同步队列（≤500条）
- `db.inboundQueue` — 离线入库待同步队列（≤500条）
- 网络恢复→自动同步（post到对应API）

**同步状态栏组件**（SyncStatus.tsx）：
- 顶部永久显示：在线/离线状态、待同步数量
- 离线时黄色提示
- 队列满400→预警，500→阻断
- 「同步」按钮（自动/手动）

### 9. 路由更新
App.tsx / router 新增以下路由：
```
/pda-login       → PdaLogin
/pda/outbound    → PdaOutbound
/pda/inbound     → PdaInbound
/qrcodes          → QrCodes
/settings         → Settings（留空，后端已就绪）
/import-export    → ImportExport（留空）
```

底部Tab导航（PDA模式下）：
```
📷扫码 · 📦库存 · 📋出入库 · 📊面板 · 👤我
```

## Webpack/项目配置
现有webpack配置在 `frontend/webpack.config.js`，支持 TypeScript + Tailwind。

PWA 支持需要加：
```bash
npm install --save workbox-webpack-plugin
# 或手动注册 service-worker.js
```

## 注意事项
1. 所有页面需要适配 5.5寸 720P 屏幕（PDA）
2. PDA 扫码自动填入+Enter，用 onChange 监听，不要用 onKeyDown
3. PDA 不设超时退出，手动点退出
4. localStorage 存 admin_token
5. 无库存时弹窗模态框（不跳转页面），内嵌新增表单
6. 离线模式自动检测网络状态（navigator.onLine + 心跳）
