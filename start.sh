#!/bin/bash
# start.sh - WMS仓库管理系统启动脚本
# 用法: bash start.sh [dev|prod]

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
VENV_DIR="$SCRIPT_DIR/venv"

# 默认配置
export WMS_HOST="${WMS_HOST:-0.0.0.0}"
export WMS_PORT="${WMS_PORT:-5174}"
export CORS_ORIGINS="${CORS_ORIGINS:-http://localhost:3000,http://127.0.0.1:3000}"

# 创建必要目录
mkdir -p "$BACKEND_DIR/data" "$BACKEND_DIR/data/uploads"

# 生成JWT密钥（如果不存在）
if [ ! -f "$SCRIPT_DIR/secrets/jwt.key" ]; then
    mkdir -p "$SCRIPT_DIR/secrets"
    "$VENV_DIR/bin/python3" -c "
from cryptography.fernet import Fernet
key = Fernet.generate_key()
with open('$SCRIPT_DIR/secrets/jwt.key', 'w') as f:
    f.write(key.decode())
import os; os.chmod('$SCRIPT_DIR/secrets/jwt.key', 0o600)
print('已生成JWT密钥')
"
fi

# 生成Fernet密钥（如果不存在）
if [ ! -f "$SCRIPT_DIR/secrets/fernet.key" ]; then
    mkdir -p "$SCRIPT_DIR/secrets"
    "$VENV_DIR/bin/python3" -c "
from cryptography.fernet import Fernet
key = Fernet.generate_key()
with open('$SCRIPT_DIR/secrets/fernet.key', 'w') as f:
    f.write(key.decode())
import os; os.chmod('$SCRIPT_DIR/secrets/fernet.key', 0o600)
print('已生成Fernet密钥')
"
fi

MODE="${1:-dev}"
echo "=== WMS仓库管理系统启动 ==="
echo "模式: $MODE"
echo "监听: $WMS_HOST:$WMS_PORT"
echo ""

if [ "$MODE" = "dev" ]; then
    exec "$VENV_DIR/bin/uvicorn" main:app \
        --host "$WMS_HOST" \
        --port "$WMS_PORT" \
        --reload \
        --app-dir "$BACKEND_DIR"
else
    exec "$VENV_DIR/bin/uvicorn" main:app \
        --host "$WMS_HOST" \
        --port "$WMS_PORT" \
        --workers 2 \
        --app-dir "$BACKEND_DIR"
fi
