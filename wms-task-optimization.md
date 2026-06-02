# WMS系统功能优化任务（正式版）

## 约束
- 端口5174，数据库 wms，JWT_SECRET 环境变量
- 技术栈：React + FastAPI + SQLAlchemy + PostgreSQL
- 前端：/root/projects/warehouse-wms/frontend/
- 后端：/root/projects/warehouse-wms/backend/
- 分支：master，先拉最新代码再改

## 一、商品管理优化

### 1.1 字段名称
- 所有页面中"商品编号"改为"SKU"
- 涉及：Products.tsx 列表表头、详情弹窗、搜索框placeholder等

### 1.2 SKU自动生成验证
- 确认：新增商品时SKU由后端自动生成（分类前缀+序号，如 SN-001、GJ-001）
- 前端选择分类后自动获取下一个SKU预览
- **删除**编辑商品弹窗中的SKU手动输入框，仅保留系统自动生成逻辑（只读显示）

## 二、页面展示统一优化

以下页面统一采用 **表格（Table）** 形式展示数据（如果当前是卡片/列表样式）：

- 仓库管理（Warehouses.tsx）
- 库位管理（Locations.tsx）
- 员工管理（Employees.tsx）
- 供应商管理（Suppliers.tsx）
- 库存页面（Inventory.tsx）

要求：
- 使用统一的 Table 组件样式（参考现有出入库或商品管理的表格风格）
- 表头清晰，列宽合理
- 支持排序（可选）

## 三、库存功能优化

### 3.1 库存编辑
- 库存页面（Inventory.tsx）新增"编辑"按钮
- 支持修改对应记录的仓库、库位信息
- 编辑弹窗或行内编辑均可

### 3.2 出入库管理表格化
- 库存出入库管理页面（StockIn/StockOut 或 InventoryRecords）采用表格形式展示
- 操作流程更清晰

### 3.3 操作按钮放大
- 出入库操作按钮（如"入库""出库""确认"等）适当放大
- 提升操作辨识度与便捷性
- 建议：min-width 至少 100px，padding 加大，字号 14-16px

## 四、商品编辑弹窗优化

- 删除编辑商品弹窗中的 SKU 手动输入框
- SKU 字段改为只读显示（系统自动生成，用户不可修改）
- 新增商品时：显示"SKU将自动生成"提示文字
- 编辑商品时：只读显示已有SKU

## 五、主面板交互优化

Dashboard.tsx 主面板中的快速信息模块：
- "商品总数" → 点击跳转到 /products
- "库存预警" → 点击跳转到 /inventory（或带筛选）
- "今日入库"/"今日出库" → 点击跳转到出入库记录页
- "供应商总数" → 点击跳转到 /suppliers
- "员工总数" → 点击跳转到 /employees

要求：加 cursor:pointer hover 效果

## 六、界面字体优化

- 导航栏（Layout侧边栏）字体加大：当前默认约14px → 建议16px
- 页面标签/Tab字体加大：当前默认约14px → 建议15-16px
- 表头字体可适当加粗
- 提升可读性与视觉清晰度

## 验证

全部完成后：
1. TypeScript 编译无报错
2. 各页面表格正常渲染
3. SKU自动生成流程正常
4. 库存编辑功能可用
5. 主面板点击跳转正常
6. Git commit + push 到 origin/master
