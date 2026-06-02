# WMS 劳保用品警告与通知系统

## 项目背景
WMS仓储管理系统（React + FastAPI + PostgreSQL），代码在 `/root/projects/warehouse-wms/`

## 需要实现的功能

### 1. 提前领取警告
- 当员工提前领取劳保用品时（实际领取日期 < 应领取日期），系统应显示警告信息
- 警告内容：提前X天领取，确认是否继续
- 在前端领取确认弹窗中显示此警告

### 2. 库存警告系统
- 劳保用品目录表 `labor_supplies` 增加 `current_stock`（当前库存）和 `warning_threshold`（预警阈值）字段
- 当库存低于预警阈值时，在页面顶部显示警告横幅
- 库存为0时，禁止发放并显示错误提示
- 发放时自动扣减库存

### 3. 待领取提醒
- 在"待领取"Tab中，已过期的用品用红色高亮显示
- 即将到期（30天内）的用品用橙色/黄色显示
- 支持按紧急程度排序（过期在前）

### 4. 通知功能
- 后端增加通知模块 `modules/notifications/`
- 数据表 `notifications`：id, type(库存警告/待领取/过期), title, message, read, created_at
- API：
  - GET /api/notifications - 获取通知列表（支持分页、未读筛选）
  - GET /api/notifications/unread-count - 获取未读数量
  - PUT /api/notifications/{id}/read - 标记已读
  - POST /api/notifications/mark-all-read - 全部标记已读
- 自动触发逻辑：
  - 库存低于阈值时自动创建"库存不足"通知
  - 员工劳保用品过期未领时自动创建"待领取"通知

### 5. 前端通知组件
- 顶部导航栏添加通知铃铛图标，显示未读数量红点
- 点击展开通知列表下拉面板
- 通知列表支持点击标记已读
- 未读通知有蓝色左边框标识

## 技术要求
- 后端使用 SQLAlchemy ORM（参考 models.py 中现有表结构）
- 前端使用 React + Tailwind CSS + lucide-react 图标
- Modal 组件需要 open, onClose, title 三个props
- 所有API需要JWT认证（参考现有模块）

## 现有代码参考
- 劳保用品模块：`backend/modules/labor_protection/`（__init__.py, service.py, model.py）
- ORM模型：`backend/models.py`（LaborSupply, PositionLaborConfig, LaborDistribution）
- 前端页面：`frontend/src/pages/LaborProtection.tsx`（四Tab：目录/配置/待领取/领取记录）
- API服务：`frontend/src/services/api.ts`
- 路由：`frontend/src/App.tsx`
- 侧边栏：`frontend/src/components/Layout/index.tsx`

## 验证标准
1. 提前领取时显示警告弹窗
2. 库存不足时页面顶部显示红色警告
3. 库存为0时无法发放
4. 通知铃铛显示未读数量
5. 通知面板可查看和标记已读
6. 所有功能集成测试通过
