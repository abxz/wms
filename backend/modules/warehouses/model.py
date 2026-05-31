"""仓库数据模型"""
WAREHOUSE_FILE = "warehouses.json"

WAREHOUSE_SCHEMA = {
    "id": str,
    "name": str,          # 仓库名称
    "code": str,          # 仓库编码 e.g. WH-001
    "address": str,       # 地址
    "contact": str,       # 联系人
    "phone": str,         # 联系电话
    "active": bool,       # 是否启用
    "remark": str,
}
