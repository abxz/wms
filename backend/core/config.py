"""仓储管理系统 - 配置"""
import os
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)

HOST = os.getenv("WMS_HOST", "0.0.0.0")
PORT = int(os.getenv("WMS_PORT", "5174"))
