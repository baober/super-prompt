#!/bin/bash
set -e

cd "$(dirname "$0")"

PID_FILE=".super-prompt.pid"
LOG_DIR=".logs"

# 检查 config.yaml 是否存在
check_config() {
  if [ ! -f config.yaml ]; then
    echo "❌ config.yaml 不存在。请先复制示例配置："
    echo "   cp config.sample.yaml config.yaml"
    echo "   然后根据需要修改配置后重新运行。"
    exit 1
  fi
}

# 从 config.yaml 读取服务器配置
load_config() {
  eval $(uv run python3 -c "
import yaml
c = yaml.safe_load(open('config.yaml')).get('server', {})
print(f\"BIND_HOST={c.get('host', '127.0.0.1')}\")
print(f\"BACKEND_PORT={c.get('backend_port', 8000)}\")
print(f\"FRONTEND_PORT={c.get('frontend_port', 5173)}\")
")
}

# 启动服务（前台模式）
start_services() {
  # 启动 backend
  uv run uvicorn backend.main:app --host $BIND_HOST --port $BACKEND_PORT &
  BACKEND_PID=$!

  # 启动 frontend
  cd frontend
  npm install --silent 2>/dev/null || true
  VITE_BACKEND_HOST=$BIND_HOST VITE_BACKEND_PORT=$BACKEND_PORT npx vite --host $BIND_HOST --port $FRONTEND_PORT &
  FRONTEND_PID=$!
  cd ..
}

# 启动服务（后台模式，使用 nohup）
start_services_bg() {
  mkdir -p "$LOG_DIR"

  # 启动 backend
  nohup uv run uvicorn backend.main:app --host $BIND_HOST --port $BACKEND_PORT \
    > "$LOG_DIR/backend.log" 2>&1 &
  BACKEND_PID=$!

  # 启动 frontend
  cd frontend
  npm install --silent 2>/dev/null || true
  nohup env VITE_BACKEND_HOST=$BIND_HOST VITE_BACKEND_PORT=$BACKEND_PORT \
    npx vite --host $BIND_HOST --port $FRONTEND_PORT \
    > "../$LOG_DIR/frontend.log" 2>&1 &
  FRONTEND_PID=$!
  cd ..
}

# 通过端口查找并终止进程
kill_port() {
  local port=$1
  local name=$2
  local pids
  pids=$(lsof -i :"$port" -t 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo "$pids" | xargs kill 2>/dev/null || true
    echo "   $name (端口 $port) 已停止"
    return 0
  fi
  return 1
}

# 检查端口是否被占用
check_ports() {
  local occupied=false
  if lsof -i :"$BACKEND_PORT" -t &>/dev/null; then
    echo "❌ 端口 $BACKEND_PORT (Backend) 已被占用。"
    occupied=true
  fi
  if lsof -i :"$FRONTEND_PORT" -t &>/dev/null; then
    echo "❌ 端口 $FRONTEND_PORT (Frontend) 已被占用。"
    occupied=true
  fi
  if [ "$occupied" = true ]; then
    echo "   请先执行: $0 stop"
    exit 1
  fi
}

# 停止服务
stop_services() {
  # 优先从 PID 文件停止
  if [ -f "$PID_FILE" ]; then
    BACKEND_PID=$(sed -n '1p' "$PID_FILE")
    FRONTEND_PID=$(sed -n '2p' "$PID_FILE")

    echo "🛑 正在停止 Super Prompt..."

    if [ -n "$BACKEND_PID" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
      kill "$BACKEND_PID" 2>/dev/null
      echo "   Backend (PID $BACKEND_PID) 已停止"
    else
      echo "   Backend 进程不存在或已停止"
    fi

    if [ -n "$FRONTEND_PID" ] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
      kill "$FRONTEND_PID" 2>/dev/null
      echo "   Frontend (PID $FRONTEND_PID) 已停止"
    else
      echo "   Frontend 进程不存在或已停止"
    fi

    rm -f "$PID_FILE"
    echo "✅ Super Prompt 已停止。"
    return
  fi

  # PID 文件不存在，尝试通过端口查找并停止
  check_config
  load_config
  echo "⚠️  未找到 PID 文件，尝试通过端口查找残留进程..."

  local found=false
  if kill_port "$BACKEND_PORT" "Backend"; then found=true; fi
  if kill_port "$FRONTEND_PORT" "Frontend"; then found=true; fi

  if [ "$found" = true ]; then
    echo "✅ 残留进程已清理。"
  else
    echo "ℹ️  未发现运行中的服务。"
  fi
}

# 保存 PID 到文件
save_pids() {
  echo "$BACKEND_PID" > "$PID_FILE"
  echo "$FRONTEND_PID" >> "$PID_FILE"
}

# 用法提示
usage() {
  echo "用法: $0 [bg|stop]"
  echo ""
  echo "  (无参数)  前台启动服务（Ctrl+C 停止）"
  echo "  bg        后台启动服务"
  echo "  stop      停止后台服务"
}

case "${1:-}" in
  "")
    # 默认前台启动
    check_config
    load_config
    check_ports
    echo "🚀 Starting Super Prompt..."
    echo "   Backend:  http://$BIND_HOST:$BACKEND_PORT"
    echo "   Frontend: http://$BIND_HOST:$FRONTEND_PORT"
    start_services
    save_pids
    trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; rm -f $PID_FILE" EXIT
    echo ""
    echo "Press Ctrl+C to stop."
    wait
    ;;
  bg)
    # 后台启动
    check_config
    load_config
    if [ -f "$PID_FILE" ]; then
      OLD_BACKEND_PID=$(sed -n '1p' "$PID_FILE")
      if [ -n "$OLD_BACKEND_PID" ] && kill -0 "$OLD_BACKEND_PID" 2>/dev/null; then
        echo "⚠️  服务已在后台运行中（Backend PID: $OLD_BACKEND_PID）。"
        echo "   如需重启，请先执行: $0 stop"
        exit 1
      fi
    fi
    check_ports
    echo "🚀 Starting Super Prompt in background..."
    echo "   Backend:  http://$BIND_HOST:$BACKEND_PORT"
    echo "   Frontend: http://$BIND_HOST:$FRONTEND_PORT"
    start_services_bg
    save_pids
    # Detach from terminal: disown background processes
    disown $BACKEND_PID 2>/dev/null || true
    disown $FRONTEND_PID 2>/dev/null || true
    echo ""
    echo "✅ 服务已在后台启动。"
    echo "   日志目录: $LOG_DIR/"
    echo "   查看后端日志: tail -f $LOG_DIR/backend.log"
    echo "   查看前端日志: tail -f $LOG_DIR/frontend.log"
    echo "   停止服务请执行: $0 stop"
    ;;
  stop)
    stop_services
    ;;
  *)
    usage
    exit 1
    ;;
esac
