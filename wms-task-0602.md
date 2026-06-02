# WMS 改造任务 2026-06-02

## 概览
共7大改造项，涉及前端7+页面、后端2+模块。

---

## 任务1: 修复导出认证（401错误）

### 根因
`api.ts` 中所有 `exportXxx()` 函数用 `window.open()` 打开新标签，浏览器不带 Authorization header，JWT中间件返回401。

### 修复方案
在 `api.ts` 顶部添加通用认证下载函数，替换所有 `window.open()` 调用：

```typescript
// 通用认证下载函数（替代所有 window.open）
async function authDownload(path: string, filename: string) {
  const token = localStorage.getItem("wms_token") || localStorage.getItem("auth_token");
  const res = await fetch(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`下载失败: ${res.status}`);
  const blob = await res.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}
```

替换所有导出函数：
```typescript
// 替换前
exportProducts: () => window.open(`${API_BASE}/api/import/export/products`, "_blank"),
// 替换后
exportProducts: () => authDownload(`/api/import/export/products`, "products.xlsx"),
```

需要替换的函数：exportProducts, exportSuppliers, exportEmployees, exportInventory, exportMasterProducts, exportMasterSuppliers, exportMasterEmployees, backupDownload

---

## 任务2: 导入导出UI增强

### 2a. 所有有导入导出的页面统一增加按钮

涉及页面：商品管理(Products.tsx)、供应商(Suppliers.tsx)、员工(Employees.tsx)、库存(Inventory.tsx)、基础数据(MasterData.tsx)、入库管理(Inbound.tsx)、出库管理(Outbound.tsx)

每个页面顶栏按钮布局：
```
[📥 导入] [📥 导出] [其他操作按钮...]
```

### 2b. 导入按钮弹窗交互

点击"导入"按钮时：
1. 弹窗提示："是否需要下载导入模板？"
2. 点击"下载模板" → 调用模板下载API（后端已有）
3. 点击"直接导入" → 打开文件选择器（.xlsx）
4. 上传后显示结果（成功数/错误列表）

### 2c. api.ts 新增导入/模板API

```typescript
// 模板下载（全部用 authDownload）
downloadMainDataTemplate: () => authDownload("/api/import/template/main-data", "主数据导入模板.xlsx"),
downloadEmployeeTemplate: () => authDownload("/api/import/template/employees", "员工导入模板.xlsx"),
downloadOrderTemplate: () => authDownload("/api/import/template/orders", "出入库导入模板.xlsx"),
downloadMasterProductsTemplate: () => authDownload("/api/import/template/master-products", "基础商品导入模板.xlsx"),
downloadMasterSuppliersTemplate: () => authDownload("/api/import/template/master-suppliers", "基础供应商导入模板.xlsx"),
downloadMasterEmployeesTemplate: () => authDownload("/api/import/template/master-employees", "基础员工导入模板.xlsx"),

// 导入上传（用 fetch + FormData + token）
uploadMainData: async (file: File) => { ... },
uploadEmployees: async (file: File) => { ... },
uploadOrders: async (file: File) => { ... },
// master data 已有 uploadMasterProducts/uploadMasterSuppliers/uploadMasterEmployees，但缺 token，需修复
```

### 2d. 导出结果反馈

导出完成后 Toast 提示"导出成功，文件已下载"。

---

## 任务3: 出库单页面修复

### 3a. 出库表单改造

当前问题：只有一个无标签select和一个数量input。

改为：
```
选择商品: [下拉选择]    ← label + select
规格:    [自动显示]     ← 选商品后从 product.spec 显示（只读）
数量:    [数字输入]     ← label + input
领用人:  [下拉选择]     ← label + select（从 employees 列表选择）
```

**规格为下拉菜单** — 因为有些商品规格较多，从已选商品的 spec 字段生成下拉选项。

实现：选中商品后，查询该商品的所有规格变体（同名不同spec的商品），生成规格下拉。如果只有一个规格则只读显示，多个规格则下拉选择。

```tsx
// 选商品后自动获取规格选项
const selectedProduct = products.find(p => p.id === it.product_id);
const specOptions = products
  .filter(p => p.name === selectedProduct?.name)
  .map(p => p.spec)
  .filter(Boolean)
  .filter((v, i, a) => a.indexOf(v) === i); // 去重
```

**领用人字段**：
```tsx
<select value={it.claimer_id || ""}
  onChange={e => {
    const emp = employees.find(em => em.id === e.target.value);
    const ni = [...form.items];
    ni[i] = { ...ni[i], claimer_id: e.target.value, claimer_name: emp?.name || "" };
    setForm({ ...form, items: ni });
  }}>
  <option value="">选择领用人</option>
  {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.employee_no})</option>)}
</select>
```

需要修改 `api.ts` 添加 `getEmployees` 的调用到出库页面。

### 3b. 入库表单同步优化

入库表单已有供应商+商品+数量+单价，保持不变，只确保label完整。

---

## 任务4: 出入库单改为表格+详情弹窗

### 4a. 出库管理页面

当前：卡片列表（order_no + 金额 + 状态）

改为表格：
```
单号 | 商品数 | 领用人 | 金额 | 状态 | 操作
OUT-xxx | 3项 | 张三 | ¥150 | 待出库 | [完成][详情]
```

点击"详情"弹出Modal显示该出库单所有商品明细：
```
出库单详情: OUT-xxx
商品名称 | 规格 | 数量 | 单价 | 小计
轴承     | 6205ZZ | 10 | ¥15 | ¥150
```

需要从 product_id 反查商品名称和规格。批量查询：
```tsx
const [productMap, setProductMap] = useState<Record<string, any>>({});

const openDetail = async (order: any) => {
  // 批量查未缓存的商品
  for (const item of order.items || []) {
    if (!productMap[item.product_id]) {
      try {
        const p = await api.getProduct(item.product_id);
        setProductMap(prev => ({ ...prev, [item.product_id]: p }));
      } catch {}
    }
  }
  setDetailOrder(order);
};
```

### 4b. 入库管理页面

同样改为表格：
```
单号 | 商品数 | 供应商 | 金额 | 状态 | 操作
IN-xxx | 2项 | ABC公司 | ¥500 | 已完成 | [详情]
```

点击详情弹出商品明细。

---

## 任务5: 员工管理模块重构

### 5a. "工种"→"角色"，新增"普通员工"

前端页面所有"工种"文字改为"角色"。

角色选项（下拉）：
- `super_admin` — 超级管理员
- `admin` — 仓库管理员  
- `claimer` — 领料人
- `normal` — 普通员工（新增）

后端 Employee 模型的 role 字段已有，无需改数据库。前端 Employees.tsx 的表头、搜索、弹窗标签全部改为"角色"。

### 5b. 姓名拆分 + 工号自动生成

**前端表单**：
```
姓:   [输入框]
名:   [输入框]    ← 合并存储为 name = "姓 + 名"
工号: [只读显示]  ← 自动生成，不可手动编辑
岗位: [下拉选择]
部门: [下拉选择]
```

**工号生成规则**：`{岗位缩写}_{姓名缩写}_{三位序号}`

- 岗位缩写：从岗位配置中获取（如 技术员→JS，管理员→GL）
- 姓名缩写：姓的第一个字拼音首字母 + 名的第一个字拼音首字母（大写）
- 三位序号：该岗位下的递增序号

示例：技术员张三 → JS_ZS_001

**后端实现**：
需要在 `modules/employees/service.py` 中添加工号生成函数：

```python
import pypinyin

POSITION_ABBR = {
    "技术员": "JS",
    "管理员": "GL", 
    "保管员": "BG",
    "采购员": "CG",
    "质检员": "ZJ",
    "安全员": "AQ",
    "普通员工": "PT",
}

def generate_employee_no(position: str, name: str) -> str:
    """生成工号: 岗位缩写_姓名缩写_三位序号"""
    pos_abbr = POSITION_ABBR.get(position, "QT")
    
    # 姓名拼音首字母
    chars = list(name)
    surname_initial = pypinyin.lazy_pinyin(chars[0])[0][0].upper() if chars else "X"
    given_initial = pypinyin.lazy_pinyin(chars[1])[0][0].upper() if len(chars) > 1 else "X"
    name_abbr = surname_initial + given_initial
    
    # 查询该岗位+姓名缩写的最大序号
    all_emps = list_employees(size=9999).get("items", [])
    prefix = f"{pos_abbr}_{name_abbr}_"
    max_seq = 0
    for emp in all_emps:
        eno = emp.get("employee_no", "")
        if eno.startswith(prefix):
            try:
                seq = int(eno.split("_")[-1])
                max_seq = max(max_seq, seq)
            except ValueError:
                pass
    
    return f"{prefix}{max_seq + 1:03d}"
```

后端新增API：
```python
@router.get("/next-no")
def next_employee_no(position: str = "", name: str = ""):
    return {"employee_no": generate_employee_no(position, name)}
```

前端调用：岗位或姓名变化时调用API预览工号。

**注意**：需要安装 pypinyin：`pip install pypinyin`

---

## 任务6: 基础数据管理 — 部门/角色/岗位

### 6a. 后端：新建 master_config 模块

新建 `modules/master_config/__init__.py` 和 `service.py`。

数据模型（直接用 JSON 存储，不需要独立表）：
```python
# 存储在 system_config 表中
# key: "departments" / "roles" / "positions"
# value: JSON 数组
# 例如 key="departments", value='["机加工车间","装配车间","仓储部","采购部","质检部"]'
```

API：
```
GET  /api/master-config/departments    — 获取部门列表
POST /api/master-config/departments    — 添加部门
DELETE /api/master-config/departments/{name} — 删除部门

GET  /api/master-config/positions      — 获取岗位列表
POST /api/master-config/positions      — 添加岗位
DELETE /api/master-config/positions/{name} — 删除岗位

GET  /api/master-config/roles          — 获取角色列表
POST /api/master-config/roles          — 添加角色
DELETE /api/master-config/roles/{name} — 删除角色
```

### 6b. 前端：MasterConfig.tsx 页面

新建 `pages/MasterConfig.tsx`，三个Tab：部门管理 / 岗位管理 / 角色管理

每个Tab：
- 列表展示（表格形式：名称 / 操作数 / 操作）
- 新增按钮 → 弹窗输入名称
- 删除按钮 → 确认弹窗
- 编辑按钮 → 弹窗修改名称

### 6c. 路由和导航

`App.tsx` 添加路由：`/master-config` → MasterConfig
`Layout/index.tsx` 侧边栏添加：基础数据（Database图标已在用，用 Settings 或 Cog）

### 6d. 注册

`main.py` 注册 master_config 模块。

---

## 任务7: 入库单采购来源（可选字段）

入库单新增字段：
- `purchase_type` — 采购类型：零星采购 / 合同采购
- `contract_no` — 采购编号（合同号或零星采购单号）

后端 `InboundOrder` 模型新增字段，数据库 ALTER TABLE。
前端入库表单增加采购类型下拉 + 编号输入框。
入库表格展示采购类型列。

---

## 执行顺序建议

1. 任务1（导出认证修复）— 最小改动，立竿见影
2. 任务5b（工号生成后端）— 需要 pypinyin 依赖
3. 任务5a（员工页面角色重构）
4. 任务6（基础数据管理模块）— 新模块，不影响现有功能
5. 任务3（出库单修复）
6. 任务4（出入库表格+详情）
7. 任务2（导入导出UI增强）— 涉及所有页面
8. 任务7（采购来源）

---

## 技术约束

- 前端 React 18 + TypeScript + Tailwind + lucide-react
- 后端 FastAPI + SQLAlchemy + PostgreSQL
- 所有 input/select 必须有 `<label>` 标签
- Modal 不能点击背景关闭（只能点X）
- 导出用 fetch+blob，不能用 window.open
- api.ts 统一封装，禁止页面直接 fetch
- 构建部署：`cd frontend && npx vite build && rm -rf /var/www/wms/assets/* && cp -r dist/* /var/www/wms/`
- 后端启动：`cd /root/projects/warehouse-wms/backend && set -a && source /root/projects/.env.runtime && export DATABASE_URL=$DB_WMS && /root/projects/warehouse-wms/venv/bin/uvicorn main:app --host 0.0.0.0 --port 5174`
