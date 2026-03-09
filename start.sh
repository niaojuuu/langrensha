#!/bin/bash
# 启动狼人杀游戏服务器
PORT=${1:-8080}
DIR="$(cd "$(dirname "$0")" && pwd)"

# 强制释放端口：先用PID文件，再用端口查找
stop_old() {
  # 方法1: PID文件
  if [ -f "$DIR/.server.pid" ]; then
    local PID=$(cat "$DIR/.server.pid")
    kill "$PID" 2>/dev/null
    rm -f "$DIR/.server.pid"
  fi

  # 方法2: 查找占用端口的node进程并杀掉
  # Windows/MINGW: 用 netstat + taskkill
  if command -v taskkill &>/dev/null; then
    local PIDS=$(netstat -ano 2>/dev/null | grep ":$PORT " | grep "LISTEN" | awk '{print $5}' | sort -u)
    for PID in $PIDS; do
      if [ -n "$PID" ] && [ "$PID" != "0" ]; then
        taskkill //PID "$PID" //F 2>/dev/null
      fi
    done
  else
    # Linux/Mac: fuser 或 lsof
    fuser -k "$PORT/tcp" 2>/dev/null || lsof -ti :"$PORT" | xargs kill 2>/dev/null
  fi

  sleep 1
}

# 检查端口是否被占用
if netstat -an 2>/dev/null | grep -q ":$PORT .*LISTEN"; then
  echo "端口 $PORT 已被占用，正在释放..."
  stop_old
  # 再次检查
  if netstat -an 2>/dev/null | grep -q ":$PORT .*LISTEN"; then
    echo "❌ 无法释放端口 $PORT，请手动关闭占用该端口的程序"
    exit 1
  fi
fi

echo "启动狼人杀游戏服务器..."
npx -y http-server "$DIR" -p "$PORT" --cors -a 0.0.0.0 -s &
SERVER_PID=$!
echo "$SERVER_PID" > "$DIR/.server.pid"

# 等待服务器就绪（最多等5秒）
READY=0
for i in 1 2 3 4 5; do
  sleep 1
  if curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:$PORT/index.html" 2>/dev/null | grep -q "200"; then
    READY=1
    break
  fi
done

if [ "$READY" = "1" ]; then
  echo ""
  echo "====================================="
  echo "  🐺 狼人杀游戏服务器启动成功！"
  echo "====================================="
  echo ""
  echo "  电脑访问: http://localhost:$PORT"
  # 显示局域网IP
  if command -v ipconfig &>/dev/null; then
    IPS=$(ipconfig | grep "IPv4" | grep -oP "\d+\.\d+\.\d+\.\d+" | grep -v "^127\.")
  else
    IPS=$(hostname -I 2>/dev/null || echo "")
  fi
  for IP in $IPS; do
    echo "  手机访问: http://$IP:$PORT"
  done
  echo ""
  echo "  按 Ctrl+C 或运行 stop.sh 停止服务器"
  echo "====================================="

  # 尝试自动打开浏览器
  if command -v start &>/dev/null; then
    start "http://localhost:$PORT"
  elif command -v xdg-open &>/dev/null; then
    xdg-open "http://localhost:$PORT"
  elif command -v open &>/dev/null; then
    open "http://localhost:$PORT"
  fi

  # 前台等待，支持 Ctrl+C
  trap 'kill $SERVER_PID 2>/dev/null; rm -f "$DIR/.server.pid"; echo ""; echo "服务器已停止"; exit 0' INT TERM
  wait $SERVER_PID
else
  echo "❌ 服务器启动失败！"
  kill $SERVER_PID 2>/dev/null
  rm -f "$DIR/.server.pid"
  exit 1
fi
