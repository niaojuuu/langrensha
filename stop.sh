#!/bin/bash
# 停止狼人杀游戏服务器
DIR="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$DIR/.server.pid"
PORT=${1:-8080}

STOPPED=0

# 方法1: PID文件
if [ -f "$PID_FILE" ]; then
  PID=$(cat "$PID_FILE")
  if kill -0 "$PID" 2>/dev/null; then
    kill "$PID" 2>/dev/null
    echo "服务器已停止 (PID: $PID)"
    STOPPED=1
  fi
  rm -f "$PID_FILE"
fi

# 方法2: 通过端口查找（Windows/MINGW）
if [ "$STOPPED" = "0" ] && command -v taskkill &>/dev/null; then
  PIDS=$(netstat -ano 2>/dev/null | grep ":$PORT " | grep "LISTEN" | awk '{print $5}' | sort -u)
  for PID in $PIDS; do
    if [ -n "$PID" ] && [ "$PID" != "0" ]; then
      taskkill //PID "$PID" //F 2>/dev/null
      echo "服务器已停止 (PID: $PID)"
      STOPPED=1
    fi
  done
fi

# 方法3: pkill
if [ "$STOPPED" = "0" ]; then
  pkill -f "http-server.*$PORT" 2>/dev/null && echo "服务器已停止" || echo "未找到运行中的服务器"
else
  rm -f "$PID_FILE"
fi
