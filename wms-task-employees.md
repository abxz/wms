# 员工管理页面优化任务

## 约束
- 端口5174，数据库 wms
- 技术栈：React + FastAPI + SQLAlchemy + PostgreSQL
- 前端：/root/projects/warehouse-wms/frontend/
- 后端：/root/projects/warehouse-wms/backend/
- 分支：master，先拉最新代码再改

## 任务清单

### 1. "角色"改为"工种"
- ROLE_LABELS 改为工种标签（保留 super_admin/admin/claimer 三个值不变，只是显示文字改）
- 表格表头 "角色" → "工种"
- 弹窗中 "角色" 标签 → "工种"
- 搜索框 placeholder "搜索姓名/工号/部门/角色..." → "搜索姓名/工号/部门/工种..."

### 2. 修复编辑时工种不变更的bug
- 问题：编辑员工时，修改"工种"下拉框选择不同值后保存，工种不会变更
- 原因：需要检查 save 函数是否正确传递 role 字段
- 检查后端 updateEmployee 是否正确处理 role 字段
- 确保 openEdit 时正确加载 item.role

### 3. 月额度改为不限额
- 表格中 "月度额度" 列改为显示 "不限" 或 "统计中"
- 弹窗中移除 "月度配额" 输入框（或改为只读显示已使用额度）
- 后端 monthly_quota 字段保留但前端不再要求输入

### 4. 增加批量删除
- 表头增加 checkbox 全选框
- 每行增加 checkbox 选择框
- 选中后顶部显示 "已选 N 人" 和 "批量删除" 按钮
- 点击批量删除弹出确认框，确认后删除所有选中员工
- 后端需要支持批量删除 API（或前端循环调用单个删除）

## 验证

1. TypeScript 编译无报错
2. 新增员工时工种下拉正常
3. 编辑员工时修改工种后保存成功
4. 批量选择和删除功能正常
5. Git commit + push
