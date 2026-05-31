# 🏭 WMS 2.0 升级技术规格书

> 版本：v1.0 DRAFT
> 状态：待审核
> 日期：2026-05-14

---

## 一、概述

WMS 1.0 已有 11 模块 / 59 API / 11 前端页面。2.0 升级引入二维码扫码体系重构出入库流程，新增导入导出、单号管理、权限体系。

### 升级核心

```
WMS 1.0                  WMS 2.0
─────────                ─────────
纯 Web 操作           →  PDA 扫码为主 + Web为辅
无编码体系            →  产品/员工全二维码化
出入库自由填          →  票据单号+自动拆单
无权限                →  三级角色（超管/仓管/领料人）
无导入导出            →  三模板 Excel 导入导出
```

---

## 二、扫码枪方案

### 硬件

| 项 | 值 |
|:--|:---|
| 型号 | 东集小码哥 **CRUISE GeP** |
| 类型 | Android 16 工业手持 PDA |
| 扫描引擎 | X3PC(HD) / X3PC(MR) 一维/二维图像扫描引擎（选配） |
| CPU | MTK8786 八核 2.0GHz |
| 内存/存储 | 4GB + 64GB |
| 屏幕 | 5.5" 1440×720 电容触摸 |
| 扫码方式 | 物理侧扫键 ×2 → 解码 → HID Keyboard 输入 |
| WiFi | 802.11ac/a/b/g/n（2.4G/5G 双频） |
| 电池 | 可拆卸 5000mAh（可选 6000mAh）|
| 防护 | IP67，1.5米跌落 |
| 摄像头 | 后置 1300万 PDAF 自动对焦+闪光灯 |
| USB | Type-C，支持 OTG |

### 接入架构

```
PDA Chrome 浏览器 → http://<服务器IP>:3000 → WMS 移动端页面
                         │
                  ┌──────┴──────┐
                  │  页面自动    │
                  │ focus 扫码框 │
                  └──────┬──────┘
                         │
        物理侧扫键按下 → X3PC 引擎解码 → HID Keyboard 模拟输入
                         │
                    ┌────┴────┐
                    │  扫码内容 │
                    │  + Enter │
                    └────┬────┘
                         │
                  前端响应 → API 查询 → 结果回填
```

### 接口预留

| 接口 | 说明 | 状态 |
|:----|:----|:----|
| Web 页面视图适配 | 5.5" 720P 横竖屏自适应 | ✅ 现有响应式布局 |
| 扫码输入焦点管理 | 页面加载自动 focus 扫码框 | 🆕 需实现 |
| 扫码连续输入去抖动 | 防多次扫码间误触发 | 🆕 需实现 |
| 扫码错误提示 | 未识别码/无效码 Toast 提示 | 🆕 需实现 |
| 摄像头拍照入口（预留） | PDA 后置 1300万摄像头，未来可拍照上传 | 🔮 预留 |
| OTG 外接扫码枪（预留） | USB Type-C 支持 OTG，可接备用枪 | 🔮 预留 |

### 交互要点

1. PDA 仅跑浏览器，不开发原生 App
2. 扫码键 = 键盘输入+回车，开发量零
3. 页面聚焦设计：打开页面自动 focus 扫码输入框，扫码后自动 refocus
4. 无离线场景，全实时 API
5. 每次扫码后自动触发查询 + 清空输入框（防重复扫描）

---

## 三、二维码体系

### 3.1 编码规则

| 对象 | 编码格式 | 示例 |
|:----|:--------|:----|
| 产品 | `QR-PROD-{product_id}` | `QR-PROD-a1b2c3d4e5f6` |
| 员工 | `QR-EMP-{employee_id}` | `QR-EMP-x1y2z3w4v5u6` |
| 库位（预留） | `QR-LOC-{location_id}` | 未来扩展 |

### 3.2 生成策略

| 场景 | 编码文本 | 二维码图片 |
|:----|:--------|:---------|
| 单个创建产品/员工 | ✅ 自动生成 | ✅ 自动生成并保存 |
| 批量导入 | ✅ 自动生成（零成本文本规则） | ❌ 不生成 |
| 批量导入后 | — | 二维码管理页 → 「一键批量生成未生成」按钮 |

### 3.3 二维码管理页面

**路由：** `/qrcodes`

**页面功能：**
- 展示所有二维码列表
- 列：产品名称/规格、员工姓名、编码、二维码预览（小图）、生成状态（已生成/未生成）、生成日期、扫码统计次数
- 「批量生成」按钮：一次性生成所有未生成的二维码图片
- 「批量下载 ZIP」按钮：下载选中二维码的图片包
- 搜索过滤：按产品名/员工名/编码搜索

### 3.4 扫码统计

每个二维码背后统计：
- 出库次数（出库时扫码）
- 出库总量
- 最近出库时间
- 用于「出入库数据统计」报表

---

## 四、权限与登录体系

### 4.1 三级角色

| 角色 | 字段值 | 说明 |
|:---:|:------|:----|
| 👑 超级管理员 | `super_admin` | 全部权限，可管理角色/系统设置/查看所有数据 |
| 👔 仓库管理员 | `admin` | PDA 扫码登录，出入库操作+库存查询 |
| 👷 领料人 | `claimer` | 被扫码确认身份，不登录 PDA |

### 4.2 数据模型

现有 `employees` 表加字段：

```python
# employees/model.py 新增
class Employee(BaseModel):
    # ... 现有字段
    role: str = "claimer"           # super_admin | admin | claimer
    qr_code: str = ""               # QR-EMP-{id}
    qr_image_path: str = ""         # 二维码图片路径
```

### 4.3 PDA 登录流程

```
┌── PDA 开屏 ──────────────────────────────────┐
│                                                 │
│  ┌─ 未登录 ──────────────────────────────┐    │
│  │  "请扫码登录"（大号提示）               │    │
│  │  管理员扫码 → 校验 role in [admin,      │    │
│  │  super_admin] → 登录成功 → 显示管理员名  │    │
│  └───────────────────────────────────────┘    │
│                                                 │
│  ┌─ 已登录 ──────────────────────────────┐    │
│  │  👑 管理员：王主管                      │    │
│  │  出库 | 入库 | 查询 | [退出登录]        │    │
│  └───────────────────────────────────────┘    │
│                                                 │
│  退出登录 → 回到未登录界面                      │
│  保持登录：不超时，不退不踢                     │
└─────────────────────────────────────────────────┘
```

### 4.4 Web 后台权限

| 页面 | super_admin | admin | claimer |
|:----|:-----------:|:-----:|:------:|
| 仪表盘 | ✅ | ✅ | ❌ |
| 商品管理 | ✅ | ✅ | ❌ |
| 库存查询 | ✅ | ✅ | ❌ |
| 出入库操作 | ✅ | ✅ | ❌ |
| 员工管理（含角色） | ✅ | ❌ | ❌ |
| 二维码管理 | ✅ | ✅ | ❌ |
| 导入导出 | ✅ | ✅ | ❌ |
| 系统设置（单号等） | ✅ | ❌ | ❌ |

---

## 五、出库扫码完整流程

### 5.1 流程

```
步骤  | 操作               | 界面反馈                        | 后端
──────┼───────────────────┼───────────────────────────────┼──────────
  1   | 管理员扫码登录      | "管理员：王主管"              | 校验身份
  2   | 扫领料人二维码      | "领料人：张三"               | 记录领料人
  3   | 扫商品码（有库存）  | 自动填充名称/规格/库存/数量=1 | 查库存
  4   | 再扫同商品          | 数量 1→2                     | （前端累加）
  5   | 扫不同商品          | 新增一行                     | —
  6   | 满 7 行             | 自动拆单，新单号 OUT-0002    | —
  7   | 手动改数量          | 改 3 为 5                    | 前端改
  8   | 选使用地点          | 下拉选/手动输入              | —
  9   | 提交                | 成功/失败提示                | 原子扣减
```

### 5.2 无库存处理

```
扫商品码 → 查库存 = 0
   → 弹窗：「未在库存中找到该商品，是否录入？」
      ├── [是] → 跳转新增商品页（预填已扫信息）
      └── [否] → 忽略本次扫码
```

### 5.3 出库单模型扩展

```python
# outbound/model.py 新增字段
class Outbound(BaseModel):
    # 现有字段
    order_no: str = ""              # OUT-2026-0001
    invoice_no: str = ""            # 关联发票号码
    claimer_id: str = ""            # 领料人 ID
    claimer_name: str = ""          # 领料人姓名（冗余便于显示）
    admin_id: str = ""              # 管理员 ID
    admin_name: str = ""            # 管理员姓名
    usage_location: str = ""        # 使用地点（下拉+手动输入）
    max_items: int = 7              # 此单上限（取自系统配置，但允许单次调整）
```

---

## 六、入库扫码流程

### 6.1 流程

```
步骤  | 操作               | 界面反馈
──────┼───────────────────┼───────────────────────────────
  1   | 管理员扫码登录      | "管理员：王主管"
  2   | 扫商品码（已有）    | 自动填充名称/规格，数量+1
  3   | 扫商品码（新品）    | 弹窗：「未找到，是否录入？」→ 录入后自动加
  4   | 满 7 行             | 自动拆单，新单号 IN-0002
  5   | 选择/输入供应商     | 下拉选已有 + 手动输入新供应商
  6   | 提交                | 库存增加
```

### 6.2 入库单模型扩展

```python
# inbound/model.py 新增字段
class Inbound(BaseModel):
    # 现有字段
    order_no: str = ""              # IN-2026-0001
    invoice_no: str = ""            # 发票号码
    admin_id: str = ""              # 管理员 ID
    supplier_name: str = ""         # 供应商
    max_items: int = 7              # 此单上限
```

---

## 七、单号系统

### 7.1 规则

| 项 | 入库 | 出库 |
|:--|:----|:----|
| 前缀 | `IN-` | `OUT-` |
| 示例 | `IN-0001` | `OUT-0001` |
| 起始 | 用户自定义 | 用户自定义 |
| 递增 | 自动 +1 | 自动 +1 |
| 手动改 | ✅ 可手动修改 | ✅ 可手动修改 |
| 满额拆单 | ✅ 超 7 行自动拆 | ✅ 超 7 行自动拆 |
| 跨单续号 | 系统记住最后号 | 系统记住最后号 |

### 7.2 配置界面

系统设置页：

```
┌── 单号设置 ─────────────────────────────────┐
│                                               │
│  入库单号起始：IN-0001                        │
│  当前入库单号：IN-0123                        │
│  出库单号起始：OUT-0001                       │
│  当前出库单号：OUT-0089                       │
│  每单上限物品数：7                            │
│                                               │
│  [保存]                                       │
└───────────────────────────────────────────────┘
```

### 7.3 拆单逻辑

```
用户扫了 10 个产品 → 检查当前单号上限 7
  → 单A：产品 1~7 → 单号 IN-0001
  → 单B：产品 8~10 → 单号 IN-0002（自动）
  → 系统记录最后号 = IN-0002
  → 下次做单 → 起始 = IN-0003
```

---

## 八、使用地点

### 8.1 字段设计

```python
usage_location: str = ""  # 自由文本，支持下拉选+手动输入
```

### 8.2 交互

- 前端输入框：**Combobox** 模式（既可从下拉列表选，也可手动打字）
- 下拉列表来源：历史使用过的地点去重
- 新输入的地点自动记录，下次出现在下拉列表

---

## 九、导入导出方案

### 9.1 三个模板

#### 模板A：主数据模板

| 列 | 说明 | 必填 | 校验规则 |
|:--|:----|:---:|:--------|
| 仓库名称 | warehouses.name | ✅ | 重复报错 |
| 仓库地址 | warehouses.address | ❌ | — |
| 商品名称 | products.name | ✅ | — |
| 商品规格 | products.spec | ❌ | — |
| 商品条码 | products.barcode | ❌ | 重复报错 |
| 库存预警数 | products.min_stock | ❌ | ≥0 整数 |
| 仓库 ID | products.warehouse_id | ✅ | 关联校验 |
| 库位名称 | products.location_name | ❌ | — |
| 供应商名称 | products.supplier_name | ❌ | — |
| 库存数量 | inventory.quantity | ❌ | ≥0 整数 |
| 发票号码 | products.invoice_number | ❌ | — |
| 单位 | products.unit | ❌ | 个/箱/kg/m |
| 单价 | products.price | ❌ | ≥0 数字 |

#### 模板B：员工模板

| 列 | 必填 | 校验 |
|:--|:---:|:----|
| 姓名 | ✅ | — |
| 部门 | ❌ | — |
| 角色 | ✅ | super_admin / admin / claimer |
| 领用额度 | ❌ | ≥0 整数 |
| 备注 | ❌ | — |

#### 模板C：出入库模板

| 列 | 必填 | 校验 |
|:--|:---:|:----|
| 类型（入库/出库） | ✅ | — |
| 单号 | ✅ | 重复报警 |
| 产品名称 | ✅ | 关联校验 |
| 数量 | ✅ | ≥1 整数 |
| 操作人 | ✅ | 关联员工表 |
| 领料人（出库） | ❌ | 关联员工表 |
| 使用地点（出库） | ❌ | — |
| 日期 | ❌ | 格式 YYYY-MM-DD |

### 9.2 导入校验规则

| 校验项 | 行为 |
|:------|:----|
| 必填字段为空 | ❌ 整行跳过，提示具体行号+字段 |
| 名称重复（同维度） | ❌ 提示「第X行：名称重复」 |
| 关联不存在（仓库/供应商） | ❌ 提示「第X行：仓库'XX'不存在」 |
| 条码格式不正确 | ❌ 提示 |
| 数量/价格非数字 | ❌ 提示 |
| 全部通过 | ✅ 写入，返回成功行数 |
| 部分通过 | ✅ 通过的行写入，失败的行返回错误列表 |

### 9.3 导出

| 项 | 说明 |
|:--|:----|
| 导出模板 | 同导入模板格式，可直接复用 |
| 自定义列 | 可选导出的列+拖动排序 |
| 导出格式 | .xlsx |
| 覆盖范围 | Products / Employees / Inbound+Outbound 分别导出 |

---

## 十、发票号码

### 10.1 当前实现

Products 表新增字段：

```python
# products/model.py
invoice_number: str = ""  # 发票号码，选填
```

- 产品列表最后一列展示
- 导入导出模板包含此字段
- 支持按发票号码搜索

### 10.2 预留对接方案

详见 `docs/INVOICE_SYSTEM_API.md`（独立文档），包含：

```
REST API 接口定义：
  POST /api/invoice-system/link      # 关联发票与产品
  GET  /api/invoice-system/{inv_no}  # 查询发票详情
  POST /api/invoice-system/sync      # 批量同步发票数据

数据流：
  发票管理系统 → API → WMS 更新 products.invoice_number
  WMS 出库 → 回传发票管理系统 → 自动开票
```

---

## 十一、数据模型变更汇总

### 11.1 修改的表

```python
# products/model.py 新增
invoice_number: str = ""

# employees/model.py 新增
role: str = "claimer"            # super_admin | admin | claimer
qr_code: str = ""                # QR-EMP-{id}
qr_image_path: str = ""          # 二维码图片路径

# outbound/model.py 新增
order_no: str = ""
invoice_no: str = ""
claimer_id: str = ""
claimer_name: str = ""
admin_id: str = ""
admin_name: str = ""
usage_location: str = ""
max_items: int = 7

# inbound/model.py 新增
order_no: str = ""
invoice_no: str = ""
admin_id: str = ""
admin_name: str = ""
supplier_name: str = ""          # 冗余存导入时的供应商名
max_items: int = 7
```

### 11.2 新增的表

无。全部在现有表上加字段。

### 11.3 新增的配置文件

```json
// backend/data/system_config.json
{
  "inbound_prefix": "IN-",
  "inbound_start_no": "IN-0001",
  "inbound_current_no": "IN-0001",
  "outbound_prefix": "OUT-",
  "outbound_start_no": "OUT-0001",
  "outbound_current_no": "OUT-0001",
  "max_items_per_order": 7
}
```

---

## 十二、新增 API 清单

| 方法 | 路径 | 功能 |
|:----|:----|:----|
| GET | `/api/system/config` | 获取系统配置（单号/上限） |
| PUT | `/api/system/config` | 更新系统配置 |
| POST | `/api/import/main-data` | 导入主数据模板（Excel） |
| POST | `/api/import/employees` | 导入员工模板（Excel） |
| POST | `/api/import/orders` | 导入出入库模板（Excel） |
| GET | `/api/export/main-data` | 导出主数据（可选列） |
| GET | `/api/export/employees` | 导出员工数据 |
| GET | `/api/export/orders?type=in|out` | 导出出入库数据 |
| GET | `/api/qrcodes` | 二维码列表（分页/搜索） |
| POST | `/api/qrcodes/generate-batch` | 批量生成未生成二维码 |
| GET | `/api/qrcodes/statistics` | 扫码统计 |
| GET | `/api/qrcodes/download-zip` | 批量下载二维码 ZIP |
| POST | `/api/auth/pda-login` | PDA 扫码登录 |
| POST | `/api/auth/pda-logout` | PDA 退出登录 |
| GET | `/api/locations/history` | 历史使用地点列表（Combobox 数据源） |

### 修改的现有 API

| 模块 | 变更 |
|:----|:----|
| Products | 增 invoice_number 字段处理 |
| Employees | 增 role / qr_code 字段处理 |
| Outbound | 增 order_no / claimer / location 字段处理 |
| Inbound | 增 order_no / invoice_no 字段处理 |
| Outbound complete | 原子扣减逻辑不变，增加扫码计数记录 |
| Inbound complete | 库存增加逻辑不变，增加扫码计数记录 |

---

## 十三、前端新增/修改页面

| 页面 | 路由 | 状态 |
|:----|:----|:----|
| PDA 登录页 | `/pda-login` | 🆕 新增 |
| PDA 出库页 | `/pda/outbound` | 🆕 新增 |
| PDA 入库页 | `/pda/inbound` | 🆕 新增 |
| 二维码管理页 | `/qrcodes` | 🆕 新增 |
| 系统设置页 | `/settings` | 🆕 新增 |
| 导入导出页 | `/import-export` | 🆕 新增 |
| Products 页 | `/products` | 🔧 修改（+发票号码列+搜索） |
| Employees 页 | `/employees` | 🔧 修改（+角色列） |

---

## 十四、项目结构变更

```
backend/
├── modules/
│   ├── auth/              🆕 PDA 登录模块
│   │   ├── __init__.py    router
│   │   └── service.py     login/logout 逻辑
│   ├── import_export/     🆕 导入导出模块
│   │   ├── __init__.py    router
│   │   └── service.py     三个模板处理+校验
│   ├── qrcode_mgmt/       🆕 二维码管理模块
│   │   ├── __init__.py    router
│   │   └── service.py     批量生成/统计/下载
│   ├── system_config/     🆕 系统配置模块
│   │   ├── __init__.py    router
│   │   └── service.py     单号/上限配置读写
│   ├── products/          🔧 修改
│   ├── employees/         🔧 修改
│   ├── inbound/           🔧 修改
│   └── outbound/          🔧 修改
├── data/
│   └── system_config.json 🆕
└── docs/
    └── INVOICE_SYSTEM_API.md 🆕

frontend/
├── src/
│   ├── pages/
│   │   ├── PdaLogin.tsx        🆕
│   │   ├── PdaOutbound.tsx     🆕
│   │   ├── PdaInbound.tsx      🆕
│   │   ├── QrCodes.tsx         🆕
│   │   ├── Settings.tsx        🆕
│   │   ├── ImportExport.tsx    🆕
│   │   ├── Products.tsx        🔧 修改
│   │   └── Employees.tsx       🔧 修改
│   ├── components/
│   │   ├── QrPreview.tsx       🆕 二维码预览组件
│   │   ├── OrderScanner.tsx    🆕 PDA 扫码组件（核心）
│   │   └── LocationCombo.tsx   🆕 使用地点组合框
```

---

## 十五、双组轮值分工

### A组（前端司）

| 任务 | 文件 |
|:----|:----|
| PDA 扫码页面（出库+入库） | `PdaOutbound.tsx`, `PdaInbound.tsx` |
| PDA 登录页 | `PdaLogin.tsx` |
| 二维码管理页 | `QrCodes.tsx` |
| 系统设置页 | `Settings.tsx` |
| 导入导出页 | `ImportExport.tsx` |
| Products 页修改 | 加发票号码列 |
| Employees 页修改 | 加角色列+二维码 |
| 核心扫码组件 | `OrderScanner.tsx` |
| 使用地点组合框 | `LocationCombo.tsx` |

### B组（后端司）

| 任务 | 文件 |
|:----|:----|
| PDA 认证模块 | `auth/` |
| 导入导出模块 | `import_export/` |
| 二维码管理模块 | `qrcode_mgmt/` |
| 系统配置模块 | `system_config/` |
| Products 模型/路由改 | invoice_number |
| Employees 模型/路由改 | role, qr_code |
| Inbound 模型/路由改 | order_no, invoice_no, 拆单 |
| Outbound 模型/路由改 | order_no, claimer, location, 拆单 |
| 发票管理系统对接文档 | `docs/INVOICE_SYSTEM_API.md` |

### 审核分工

| 审次 | 审什么 |
|:----|:------|
| **一审（A审B）** | API 字段名/类型/错误码：auth、import_export、qrcode_mgmt 接口 |
| **一审（B审A）** | 扫码焦点输入、拆单前端逻辑、Combobox 数据流 |
| **二审（都水司）** | 拆单一致性（前后端算法同步）、原子扣减防超卖、导入校验完整性 |

---

## 十六、审查修复项

规格书 v1.0 → v1.1 基于都水司二审+弹劾制攻防测试发现的全部问题修复记录。

### 🔴1 — 拆单事务一致性（已修复）

> 章节 7.3 补充

拆单时引入**整批一次性提交**机制：

```python
# 拆单提交逻辑
# 前端：所有子单暂存本地，不逐单提交
# 后端：接收子单数组，在一个事务/文件锁内全部处理
def submit_split_orders(orders: list[Order]):
    with filelock("orders.lock"):  # 防并发
        for order in orders:
            validate_stock(order)    # 先验全部
        for order in orders:
            deduct_stock(order)      # 统一扣减
        for order in orders:
            save_order(order)        # 统一写入
```

- 要么全部成功，要么全部回滚
- 前端扫完才一次性提交，中途不扣库存

### 🔴2 — 无库存弹窗跳转导致当前单丢失（已修复）

> 章节 5.2 改为模态内嵌表单

当扫到不存在商品时：

```
扫商品码 → 查库存 = 0
  → 弹窗模态框（不离开当前页面）
      ├── 表单：商品名称（预填扫码内容）/ 规格 / 条码 / 供应商
      ├── [保存并继续] → 后台创建商品 → 自动加入当前出库单
      └── [取消] → 关弹窗，继续扫码
```

- 模态框内嵌新增表单，不跳转页面
- 当前出库单内容完整保留

### 🔴3 — system_config.json 并发竞态（已修复）

> 章节 11.3 补充文件锁

JSON 文件读写必须加锁：

```python
import fcntl, json

class SystemConfig:
    def __init__(self, path="data/system_config.json"):
        self.path = path
        self.lock = open(path + ".lock", "w")

    def get_next_no(self, prefix: str) -> str:
        fcntl.flock(self.lock, fcntl.LOCK_EX)  # 排他锁
        try:
            config = json.load(open(self.path))
            no = config[f"{prefix}_current_no"]
            config[f"{prefix}_current_no"] = increment(no)
            json.dump(config, open(self.path, "w"))
            return no
        finally:
            fcntl.flock(self.lock, fcntl.LOCK_UN)
```

- Linux/macOS 用 `fcntl.flock`
- Windows 用 `msvc.locking`（或统一用 `filelock` 库）
- 锁粒度按单号前缀，入库和出库互不影响

### 🔴4 — PDA 登录状态无持久化（已修复）

> 章节 4.3 补充

**PDA 端：**
- `localStorage` 存 `admin_token` / `admin_id` / `admin_name` / `login_time`
- 页面加载时读 localStorage → 有效 → 直接进入工作页
- 退出登录 → 清除 localStorage

**后端端：**
- `POST /api/auth/pda-login` 返回 `session_token`（JWT 或随机串）
- `POST /api/auth/pda-verify` 校验 token 有效性
- 每次 API 请求带 `Authorization: Bearer <token>`

**切换管理员处理：**
- 新管理员扫码登录时，旧 token 失效
- 提示「当前管理员 X 将退出，是否继续？」→ 确认后切换
- 同一账号不可在两台 PDA 同时在线

### 🟡1 — 扫码后 Enter 误触提交（已修复）

> 章节 二.交互要点 补充

- 扫码输入框使用 `onChange` 事件监听（而非 `onKeyDown/Enter`）
- 监听 `input` 值变化 + 300ms 去抖 → 值稳定后触发查询
- 防止 Enter 键误触其他按钮
- 扫码后立即 `inputRef.current.focus()` 确保焦点回到扫码框

### 🟡2 — 拆单提交时机（已修复）

> 章节 7.3 补充交互

当达到单上限时：

```
扫到第8个产品 → 弹窗：「已满7个，此单将自动锁定为 IN-0001」
  ├── [确认并继续] → 锁定单A，开始单B（序号 +1）
  └── [暂不提交]  → 保留当前单，不自动提交（用户可以手动改数量后提交）

所有子单全部完成后，统一预览：
  单A：IN-0001（7个产品）
  单B：IN-0002（3个产品）
  [全部提交] → 一次性提交所有子单（同🔴1）
```

### 🟡3 — 二维码扫码统计数据模型（已修复）

> 章节 3.4 补充数据模型

```python
# qrcode_mgmt/service.py 新增扫码统计
class QrStatistic(BaseModel):
    target_type: str           # "product" | "employee"
    target_id: str             # product_id / employee_id
    qr_code: str               # QR-PROD-xxx
    scan_count_out: int = 0    # 出库扫码次数
    scan_count_in: int = 0     # 入库扫码次数
    total_qty_out: int = 0     # 累计出库总量
    total_qty_in: int = 0      # 累计入库总量
    last_scan_time: str = ""   # 最近扫码时间
    created_at: str = ""
    updated_at: str = ""
```

每次出入库完成时更新统计数据 → JSON 文件 `data/qr_statistics.json`

### 🟡4 — 导入模板C执行顺序（已修复）

> 章节 9.2 补充导入规则

```
导入出入库模板 → 校验全部行 → 按日期排序 → 先入库后出库 → 逐行执行

执行规则：
  - 有日期列 → 按日期升序
  - 同一天 → 先入库后出库
  - 出库时库存不足 → ❌ 该行跳过，报错「第X行：库存不足（当前库存Y）」
  - 不阻断其他行执行

校验阶段（不执行）→ 执行阶段（逐行，不可回滚）
所有错误行汇总在导入结果报告中返回
```

### 🟢1 → 🔶 PDA 离线扫码（升格为正式功能）

> 章节 二「离线场景」新增

#### 整体架构

```
在线模式                             离线模式
┌─────────────┐                   ┌──────────────────┐
│ PDA 在线     │                   │ PDA 断网          │
│ 实时 API     │     ← 网络中断 →  │ IndexedDB 本地存储 │
│ 数据在服务端 │                   │ Service Worker 缓存│
└──────┬──────┘                   └──────┬───────────┘
       │                                  │
       └────────── 网络恢复 ──────────────┘
                    │
              ┌─────┴─────┐
              │ 同步引擎    │
              │ 冲突检测    │
              │ 批量推送    │
              └─────┬─────┘
                    │
              ┌─────┴─────┐
              │ 服务端写入  │
              │ 更新库存    │
              │ 记录日志    │
              └───────────┘
```

#### 离线能力矩阵

| 能力 | 在线 | 离线 | 说明 |
|:----|:---:|:---:|:----|
| 管理员登录 | ✅ | ✅ | localStorage 缓存 token |
| 产品数据匹配 | ✅ | ✅ | 产品数据缓存在 IndexedDB |
| 员工数据匹配 | ✅ | ✅ | 员工数据缓存在 IndexedDB |
| 扫码出入库 | ✅ | ✅ | 数据暂存本地队列 |
| 库存实时查询 | ✅ | ⚠️ 降级 | 显示本地缓存库存，标记「可能过期」 |
| 二维码管理 | ✅ | ❌ | 离线不生成/下载二维码 |
| 导入导出 | ✅ | ❌ | 需服务端处理 |
| 自动拆单 | ✅ | ✅ | 离线也能拆，同步时检查单号冲突 |
| 提交 | ✅ | 暂存 | 存 IndexedDB，标记「待同步」 |

#### 数据缓存策略

| 缓存 | 内容 | 大小预估 | 更新策略 |
|:----|:----|:--------|:--------|
| Service Worker | HTML/CSS/JS 页面资源 | ~2MB | 版本更新时触发 |
| IndexedDB 产品库 | 最近 2000 个活跃产品 | ~1MB | 每次在线时后台增量拉取 |
| IndexedDB 员工库 | 全部员工 | ~50KB | 每次在线时拉取 |
| IndexedDB 库存快照 | 产品 ID → 当前库存量 | ~200KB | 在线时定时更新 |
| IndexedDB 扫码队列 | 待同步的出入库记录 | ≤ 500 条 | 同步后清除 |

#### 离线扫码流程

```
可用网络？
  ├── ✅ 在线 → 直接 API（原流程）
  └── ❌ 离线 → 进入离线模式
                  │
            ┌─────┴──────┐
            │ 提示：「离线模式」 │
            │ 显示待同步数量     │
            └─────┬──────┘
                  │
          PDA 继续正常扫码操作
                  │
            扫码→查 IndexedDB 产品库→匹配
                  │
            所有数据存 IndexedDB 扫码队列
                  │
            标注：「待同步」状态
                  │
         ┌─── 网络恢复 ───┐
         │                │
   自动检测在线      手动点「同步」
         │                │
         └──────┬─────────┘
                │
         同步引擎执行：
          1. 按顺序推送到服务端
          2. 服务端校验库存/单号
          3. 成功→清除本地记录
          4. 失败→标记冲突，提示用户
```

#### 同步引擎

```python
# 同步逻辑（服务端接收离线数据）
class SyncEngine:
    def sync_orders(self, pending_orders: list):
        """
        接收 PDA 离线期间积累的出入库记录
        按时间戳顺序执行
        """
        results = []
        for order in sorted(pending_orders, key=lambda o: o["timestamp"]):
            # 校验单号是否已被占用
            if self.check_order_no_conflict(order["order_no"]):
                results.append({
                    "status": "conflict",
                    "order_no": order["order_no"],
                    "message": "单号已被其他订单占用，请确认后重新指定单号"
                })
                continue
            # 校验库存（出库时）
            if order["type"] == "outbound":
                ok, msg = self.validate_stock_for_order(order)
                if not ok:
                    results.append({
                        "status": "stock_shortage",
                        "order_no": order["order_no"],
                        "message": msg
                    })
                    continue
            # 执行
            self.execute_order(order)
            results.append({
                "status": "success",
                "order_no": order["order_no"]
            })
        return results
```

#### 冲突处理规则

| 冲突类型 | 自动解决 | 需人工介入 |
|:--------|:-------:|:---------|
| 单号冲突（两台PDA离线用了同一单号） | ❌ | ✅ 提示用户重指定 |
| 库存不足（离线时 A 出了10个，B也出了10个，但实际只剩5个） | ❌ | ✅ 提示超额部分 |
| 同产品同时编辑 | ✅ 按时间戳后写为准 | ❌ |
| 员工已删除 | ❌ | ✅ 提示该员工已无效 |

#### 同步 UI

```
┌── PDA 同步状态栏（顶部永久可见） ──────────┐
│                                              │
│  📶 在线 | 待同步: 0 条                      │
│                                              │
│  📶 离线 · 已暂存 23 条记录                  │
│  [点击同步] 最后同步时间: 14:30              │
│                                              │
│  ⚠️ 同步冲突: 2 条需要确认                    │
│  [查看冲突]                                   │
└──────────────────────────────────────────────┘
```

#### 离线适用场景判断

| 场景 | 适合离线？ | 说明 |
|:----|:---------:|:----|
| 仓库角落 WiFi 弱，信号断断续续 | ✅ | 自动切离线，连上自动同步 |
| PDA 带出仓库到无网区域盘点 | ✅ | 全离线操作 |
| 多台 PDA 同时在仓库深处工作 | ✅ 有条件 | 离线各自扫，回办公室统一同步 |
| 仓库完全没有网络覆盖 | ⚠️ 需评估 | 全离线可用，但首次需在线同步数据到 PDA |

#### 离线带来的模型变更

```python
# PDA 扫码队列记录（服务端确认后清除）
class OfflineQueueItem(BaseModel):
    id: str
    pda_id: str                    # 哪个 PDA 记录的
    admin_id: str                  # 管理员
    type: str                      # "inbound" | "outbound"
    order_no: str                  # 本地分配的单号
    items: list                    # 商品列表
    usage_location: str = ""
    claimer_id: str = ""
    timestamp: str                 # 本地记录时间
    synced: bool = False           # 是否已同步
    sync_time: str = ""
    conflict: bool = False         # 是否有冲突
    conflict_message: str = ""
```

### 🟢2 — 管理员多设备登录（已记录为规则）

> 章节 4.3 补充

规则：同一管理员账号只允许在一台 PDA 上保持登录状态。新设备登录 → 旧设备 token 失效 → 旧设备下次操作时提示「登录已过期，请重新扫码」。

### 🟢3 — 使用地点历史列表防膨胀（已记录）

> 章节 8.2 补充

- 地点下拉列表按使用频率降序排列
- 仅显示最近 50 条不同地点
- 支持输入搜索过滤
- 数据库/JSON 中保存全部历史，仅 UI 限制显示量

---

## 香港都水司（Claude Code）审查修复项

规格书 v1.1 → v1.2 基于香港 Claude Code 架构审核 + 攻防模拟发现的补充修复。

### 🔴 S2 — Excel 导入安全校验（香港发现）

> 章节 9.2 补充安全规则

导入 Excel 需添加安全防护：

```python
# import_export/service.py
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_MIME_TYPES = [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
]

def validate_import_file(file):
    # 大小限制
    if file.size > MAX_FILE_SIZE:
        raise HTTPException(413, "文件超过 10MB 限制")
    # MIME 校验
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(415, "仅支持 .xlsx 和 .xls 文件")
    # 关闭公式计算（防注入）
    wb = openpyxl.load_workbook(file.file, data_only=True)  # data_only=True
```

### 🟡 M1 — 库存操作审计日志（香港发现）

> 新增独立模块

每次库存变动（入库、出库、导入调整、手动调整）都记一条不可变日志：

```python
# stock_mutations/model.py
class StockMutation(BaseModel):
    id: str = ""               # 唯一 ID
    type: str = ""             # "inbound" | "outbound" | "adjust" | "import"
    ref_id: str = ""           # 关联单号（order_no / import batch id）
    product_id: str = ""       # 操作的商品
    qty_before: int = 0        # 操作前库存
    qty_change: int = 0        # 变化量（正=入库，负=出库）
    qty_after: int = 0         # 操作后库存
    operator_name: str = ""    # 操作人
    source: str = ""           # "pda" | "web" | "import"
    timestamp: str = ""        # 操作时间
    detail: str = ""           # 备注
```

- 只追加，不修改，不删除
- 支持按时间/商品/操作人/类型筛选查询
- 数据存储：`data/stock_mutations.json`（按月滚动，每月一个新文件）

### 🟡 M2 — QR 永久 ID 替代 product_id（香港发现）

> 章节 3.1 修正

当前 QR 编码 `QR-PROD-{product_id}` 在产品删除后无法复用同一二维码。改为：

```python
# products/model.py
qr_uuid: str = ""  # 创建时生成 uuid4().hex[:12]，永久不变
qr_code: str = ""  # QR-PROD-{qr_uuid}
```

```
编码规则更改：
  旧：QR-PROD-{product_id}  →  产品删重建 → 二维码失效
  新：QR-PROD-{qr_uuid}     →  永久不变，标签印了永远能用

影响范围：
  - Products 模型：新增 qr_uuid 字段（创建时自动生成）
  - 二维码管理页：按 qr_uuid 生成图片，不依赖 product_id
  - 扫码后端：QR-PROD-{qr_uuid} → 查 products.json → 定位商品
  - 离线扫码：PDA IndexedDB 按 qr_uuid 匹配，不受数据库 ID 变化影响
```

### 🔴 O1 — 离线同步无事务保护（香港 v2 发现）

> 章节 🟢1→🔶「同步引擎」补充

`SyncEngine.sync_orders()` 当前逐条提交，与在线拆单 🔴1 存在同样问题：

```python
# 修复后：离线同步也整批事务
class SyncEngine:
    def sync_orders(self, pending_orders: list):
        with filelock("sync.lock"):
            # 阶段1：全部校验
            for order in sorted(pending_orders, key=lambda o: o["timestamp"]):
                self.validate(order)   # 检验库存/单号/员工
            # 阶段2：全部执行
            for order in sorted(...):
                self.execute_order(order)
            # 阶段3：全部确认
            self.mark_synced(pending_orders)
            # 任一阶段失败 → 全部回滚
```

全部成功才算同步，部分失败不写任何数据。

### 🔴 O2 — 离线本地单号必然冲突（香港 v2 发现）

> 章节 🟢1→🔶「冲突处理」重设计

两台 PDA 都断网时从同一基数开始生号 → 同步必冲突。改为：

```
离线单号格式：DRAFT-{pda_id}-{seq}
  示例：DRAFT-PDA001-0001, DRAFT-PDA002-0001

同步时：
  ① 服务端验证所有 DRAFT 号
  ② 分配正式单号：IN-0001, IN-0002（自动递增）
  ③ 返回 PDA：映射表 {DRAFT-PDA001-0001 → IN-0001}

PDA 端：
  - 离线时全部用 DRAFT 号，告诉用户「这是临时号」
  - 同步后显示正式号映射
  - 打印/贴标签等使用正式号
```

### 🟡 O3 — 无缓存过期策略（香港 v2 发现）

> 章节 🟢1→🔶「数据缓存策略」补充

```python
# Products 模型加时间戳
class Product:
    # ... 现有字段
    updated_at: str = ""  # 最后更新时间

# PDA 增量拉取逻辑
def pull_product_updates(last_sync_time: str):
    """只拉取 last_sync_time 之后更新的产品"""
    products = load_products()
    changed = [p for p in products if p.updated_at > last_sync_time]
    return changed
```

- 产品/员工模型加 `updated_at` 字段
- PDA 同步时传 `last_sync_time`，只拉变更数据
- 删除的产品标记 `deleted_at`，PDA 同步时从本地缓存移除

### 🟡 O4 — 缓存外产品离线不可见（香港 v2 发现）

> 章节 🟢1→🔶「离线扫码流程」补充

当 PDA 离线扫了一个不在本地缓存的商品：

```
扫码 → IndexedDB 未命中
  → 弹窗：「此商品不在本地缓存中」
  → 记录扫码内容（QR 编码 + 时间戳）到「待补录」队列
  → 上线后自动尝试从服务器拉取该商品信息
  → 拉取成功 → 补充到出入库记录
  → 拉取失败（商品不存在）→ 标记为「未知商品」等待处理
```

### 🟡 O5 — "Last write wins" 不适合仓库操作（香港 v2 发现）

> 章节 🟢1→🔶「冲突处理」修正

仓库操作是**增量**（扫一下 +5，再扫一下 -3），不是绝对值的覆盖。修正冲突规则：

```
冲突类型                     | 解决方案
────────────────────────────┼────────────────────────────────
同产品同时编辑（增量冲突）    | ✅ 所有增量按时间戳顺序全部应用
                              非「后写覆盖」
                              例：PDA-A 入库+10 → PDA-B 出库-3
                              → 最终 +7（两个操作都记）
跨PDA重复扫码                | ✅ 加全局唯一 pda_scan_id 去重
                              同一扫码 ID 只执行一次
```

每个扫码操作都带一个全局唯一 `pda_scan_id`（UUID），服务端去重。同一笔扫码不会被执行两次。

### 🟡 O6 — 跨 PDA 重复扫码去重（香港 v2 发现）

> 章节 🟢1→🔶「冲突处理」新增

```python
# 每次扫码生成全局唯一 ID
class ScanEvent(BaseModel):
    pda_scan_id: str = ""        # uuid4().hex，全局唯一
    pda_id: str = ""
    qr_code: str = ""
    qty: int = 1
    timestamp: str = ""

# 服务端去重表（data/sync_dedup.json）
# 存储已处理过的 pda_scan_id
# 同步时遇重复 ID → 跳过，返回「已处理」
```

### 🟡 O7 — 缓存队列满 500 条处理（香港 v2 发现）

> 章节 🟢1→🔶「离线扫码流程」补充

```
IndexedDB 扫码队列状态管理：

  ≤ 400 条  → 正常操作，状态栏显示待同步数
  401~499   → 顶部黄色提示：「即将存满，请尽快同步」
  500 条     → 阻断扫描：「存储已满，请先同步」
               → 点「立即同步」→ 尝试同步
               → 仍离线 → 提示「请在网络恢复后同步」
```

| 技术补丁 | 说明 | 工作量 |
|:--------|:----|:-----|
| `navigator.storage.persist()` | 启动时调一次，防 IndexedDB 被回收 | 1 行 JS |
| SW `skipWaiting` + `clients.claim` | 定义 SW 更新策略，新版本立即接管 | 3 行 JS |

---

## 十七、开发顺序

```
Phase 1 — 数据模型改造（B组）
  ├── Products: invoice_number, qr_uuid（永久ID）
  ├── Employees: role, qr_code
  ├── Inbound: order_no, invoice_no, admin, max_items
  ├── Outbound: order_no, invoice_no, claimer, admin, location, max_items
  ├── system_config.json
  └── stock_mutations 审计日志模块

Phase 2 — 二维码体系（B组+A组并行）
  ├── B组：qrcode_mgmt 模块（CRUD+按 qr_uuid 生成+统计+下载）
  ├── A组：QrCodes.tsx 管理页 + QrPreview.tsx
  └── QR 编码改为永久 UUID（M2）

Phase 3 — PDA 扫码核心（A组先行+B组配合）
  ├── A组：OrderScanner.tsx 组件 + PdaLogin/PdaOutbound/PdaInbound
  ├── A组：Service Worker + IndexedDB 离线缓存层
  ├── A组：同步状态栏 UI + 冲突提示
  ├── B组：auth 模块 PDA 登录 + session_token
  ├── B组：location history API
  └── B组：sync_engine 同步接口 + 冲突检测

Phase 4 — 导入导出 + 安全加固（B组+A组并行）
  ├── B组：import_export 模块（三模板+校验+安全+S2文件校验）
  ├── B组：Excel 安全校验（大小/MIME/关公式）
  └── A组：ImportExport.tsx 页面

Phase 5 — 单号+系统配置 + 审计（B组）
  ├── B组：system_config 模块 + 拆单逻辑（前后端对齐+fcntl锁）
  ├── B组：stock_mutations 审计查询 API
  └── A组：Settings.tsx 页面

Phase 6 — 离线同步收尾（A组+B组联合）
  ├── B组：sync 同步引擎完整实现（整批事务 O1 + DRAFT编号 O2 + 去重 O6）
  ├── B组：products/employees 加 updated_at（O3 缓存过期）
  ├── B组：pda_scan_id 去重表（O5/O6 增量冲突）
  ├── A组：离线→在线自动切换 + 冲突 UI
  ├── A组：缓存未命中弹窗（O4 待补录队列）
  ├── A组：队列满 400/500 状态管理（O7）
  ├── A组：navigator.storage.persist() + SW skipWaiting（技术补丁）
  └── 集成测试（含断网模拟+双 PDA 冲突）

Phase 7 — 发票对接文档 + 互审集成测试
  ├── B组：docs/INVOICE_SYSTEM_API.md（已完成）
  ├── 一审交叉审核（接口契约）
  ├── 二审上级审核（架构/安全）
  └── 集成测试 + PDA 扫码实测 + 离线实测
```
