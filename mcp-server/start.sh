#!/bin/bash
# WMS MCP Server 启动脚本
# Streamable HTTP 模式，默认端口 5175

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# 加载 WMS 环境变量
if [ -f "$PROJECT_DIR/backend/.env.runtime" ]; then
    source "$PROJECT_DIR/backend/.env.runtime"
fi

export MCP_HOST="${MCP_HOST:-0.0.0.0}"
export MCP_PORT="${MCP_PORT:-5175}"

echo "Starting WMS MCP Server..."
echo "  WMS API:    ${WMS_BASE_URL:-http://localhost:5174}"
echo "  MCP listen: ${MCP_HOST}:${MCP_PORT}"
echo "  Transport:  streamable-http"

cd "$SCRIPT_DIR"
exec python3 server.py
