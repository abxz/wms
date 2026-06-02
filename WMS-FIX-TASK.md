# WMS 仓储管理系统 - 修复任务

## 项目结构
- 后端: FastAPI + SQLAlchemy + PostgreSQL 13
- 前端: React + Vite + Tailwind + TypeScript
- 位置: /root/projects/warehouse-wms/
- 后端入口: backend/main.py
- 前端入口: frontend/src/
- 启动: uvicorn main:app --app-dir backend --host 0.0.0.0 --port 5174

## 后端架构
- modules/ 目录包含各功能模块（products, suppliers, employees, inventory, warehouses, locations, inbound, outbound, import_export, auth, dashboard 等）
- 每个模块通常有 __init__.py（路由）, service.py（业务逻辑）, model.py（ORM模型）, schema.py（Pydantic）
- JWT认证中间件: middleware/jwt_auth.py（PUBLIC_PATH_PREFIXES 包含 /api/dashboard/）
- 数据库: PostgreSQL，连接字符串从环境变量 DATABASE_URL 读取
- database.py 在 core/ 目录

## 需修复的12个问题

### 功能新增（前端+后端）
1. **账号密码功能**：为仓储管理增加登录认证页面（已有JWT中间件，需要前端登录页+后端用户表）
2. **商品导入导出**：添加Excel/CSV导入导出功能（前后端都需要）
3. **供应商导入导出**：同上
4. **员工角色区分**：员工表增加 role 字段（admin/employee），普通员工限制权限
5. **员工导入导出**：添加导入导出
6. **库存导入导出**：添加导入导出

### Bug修复（Internal Server Error）
7. **发票页面 Internal Server Error**：点击发票页面报500错误
8. **创建仓库 Internal Server Error**：POST到仓库创建接口报500
9. **库位点击创建没有反应**：前端创建库位按钮无响应
10. **新增员工点击创建没反应**：前端创建员工按钮无响应
11. **新增供应商 Internal Server Error**：POST到供应商创建接口报500
12. **创建出库单 Internal Server Error**：POST到出库单创建接口报500

## 后端日志线索（/root/projects/logs/wms.log）
```
HTTPException: 401: 缺少认证令牌
  at middleware/jwt_auth.py line 48
```
说明：POST请求缺乏有效的JWT Token，需要在前端创建操作时携带Token，或在公开路径白名单中添加这些写入端点（不推荐）。

## 约束
1. PostgreSQL 数据库已存在，表结构已建好（通过 models.py）
2. 不要修改数据库连接配置（从DATABASE_URL环境变量读取）
3. 前端不要改动UI布局（左侧栏布局已改好）
4. import_export 模块已存在目录 /backend/modules/import_export/__init__.py，可直接扩展
5. 修改后的代码需要能正常运行

## 验证命令
```
cd /root/projects/warehouse-wms/backend
python3 -c "import sys; sys.path.insert(0,'.'); from models import *; print('models OK')"
cd /root/projects/warehouse-wms/frontend && npm run build 2>&1
```
