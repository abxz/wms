"""劳保用品数据模型"""
from pydantic import BaseModel
from typing import Optional


class LaborSupply(BaseModel):
    """劳保用品目录"""
    id: str = ""
    name: str                           # 名称（如"安全帽"）
    category: str = ""                  # 分类（头部/眼面/呼吸/手足/躯体/防坠）
    spec: str = ""                      # 规格
    unit: str = "个"                    # 单位
    default_cycle_months: int = 12      # 默认发放周期（月）
    gb_ref: str = ""                    # 国标参考（如 GB 39800.1-2020）
    current_stock: int = 0
    warning_threshold: int = 10
    remark: str = ""
    active: bool = True
    created_at: str = ""
    updated_at: str = ""


class PositionLaborConfig(BaseModel):
    """岗位-劳保用品配置"""
    id: str = ""
    position: str                       # 岗位名称
    supply_id: str                      # 劳保用品ID
    supply_name: str = ""               # 冗余名称（查询方便）
    cycle_months: int = 12              # 该岗位此用品发放周期（月）
    qty_per_cycle: float = 1            # 每次发放数量
    active: bool = True
    created_at: str = ""
    updated_at: str = ""


class LaborDistribution(BaseModel):
    """劳保用品领取记录"""
    id: str = ""
    employee_id: str                    # 员工ID
    employee_name: str = ""             # 员工姓名
    employee_no: str = ""               # 员工编号
    position: str = ""                  # 岗位
    supply_id: str                      # 劳保用品ID
    supply_name: str = ""               # 劳保用品名称
    quantity: float = 1                 # 领取数量
    planned_date: str = ""              # 应领取日期（用于过期计算）
    actual_date: str = ""               # 实际领取日期
    next_date: str = ""                 # 下次应领取日期
    cycle_months: int = 12              # 发放周期
    remark: str = ""
    created_at: str = ""
    updated_at: str = ""
