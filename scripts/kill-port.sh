#!/bin/bash
# 杀掉占用 3000/3001/3002 端口的进程，删除 .next 缓存，重启开发服务器
# Usage: bash scripts/kill-port.sh
# 首次冷编译约 5-10 分钟，耐心等待

PORTS=(3000 3001 3002)
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# =========================================
# 辅助函数：带时间戳输出
# =========================================
SCRIPT_START=$(date +%s)
log() {
  local now=$(date '+%H:%M:%S')
  local elapsed=$(( $(date +%s) - SCRIPT_START ))
  printf "[%s] [%3ds] %s\n" "$now" "$elapsed" "$1"
}

highlight() {
  local now=$(date '+%H:%M:%S')
  local elapsed=$(( $(date +%s) - SCRIPT_START ))
  echo ""
  printf "\033[1;36m━━━ [%s] [%3ds] %s ━━━\033[0m\n" "$now" "$elapsed" "$1"
  echo ""
}

ok()   { printf "  \033[1;32m✅\033[0m %s\n" "$1"; }
warn() { printf "  \033[1;33m⚠️\033[0m %s\n" "$1"; }
info() { printf "  \033[1;34mℹ️\033[0m  %s\n" "$1"; }

# =========================================
# 编译耗时参考信息
# =========================================
print_compile_guide() {
  echo ""
  echo "  ┌─────────────────────────────────────────────────────┐"
  echo "  │ 冷编译预计耗时（沙箱实测）：                       │"
  echo "  │  ├ 服务器就绪   约 6 分钟 (375s)                  │"
  echo "  │  ├ Middleware   约 5 秒   (4.5s)                   │"
  echo "  │  ├ 首页 (/)     约 10 分钟 (584s / 724 modules)    │"
  echo "  │  ├ API 路由     约 10-30 秒/个                     │"
  echo "  │  └ 管理后台页   约 1-3 分钟                        │"
  echo "  │                                                   │"
  echo "  │ 编译时终端光标闪烁 / CPU 占用 = 正常运行           │"
  echo "  │ 如超过15分钟无输出，按 Ctrl+C 中断后再试           │"
  echo "  └─────────────────────────────────────────────────────┘"
  echo ""
}

# =========================================
# Step 1: 检查端口占用
# =========================================
highlight "Step 1/4 - 检查并清理端口占用"

for PORT in "${PORTS[@]}"; do
  PID=$(lsof -ti :$PORT 2>/dev/null)
  if [ -n "$PID" ]; then
    log "端口 $PORT 被 PID $PID 占用，正在杀掉..."
    kill -9 $PID 2>/dev/null
    sleep 1
    if lsof -ti :$PORT >/dev/null 2>&1; then
      warn "端口 $PORT 未能释放，请手动检查"
    else
      ok "端口 $PORT 已释放"
    fi
  else
    log "端口 $PORT 未被占用"
  fi
done

# =========================================
# Step 2: 删除缓存
# =========================================
highlight "Step 2/4 - 删除 .next 缓存"

if [ -d "$PROJECT_DIR/.next" ]; then
  rm -rf "$PROJECT_DIR/.next"
  ok "缓存已清除"
else
  info "无缓存，跳过"
fi

# =========================================
# Step 3: 显示编译参考
# =========================================
highlight "Step 3/4 - 冷编译耗时参考"
print_compile_guide

# =========================================
# Step 4: 启动开发服务器
# =========================================
highlight "Step 4/4 - 启动开发服务器（端口 3001）"
log "正在启动，冷编译请耐心等待 5-10 分钟..."
info "关注终端关键标记: ✓ Ready → ○ Compiling / → ✓ Compiled /"

echo ""
# --------------------------------------------------
# 启动 next dev，输出每行带时间戳标记
# 识别关键事件并用颜色高亮
# --------------------------------------------------
cd "$PROJECT_DIR"

# 检测是否有 ts 命令（moreutils 包）
HAS_TS=false
command -v ts >/dev/null 2>&1 && HAS_TS=true

# 用颜色高亮关键编译事件
npm run dev 2>&1 | while IFS= read -r line; do
  NOW=$(date '+%H:%M:%S')
  ELAPSED=$(( $(date +%s) - SCRIPT_START ))

  # 根据不同事件标记不同颜色
  if [[ "$line" == *"✓ Ready"* ]]; then
    printf "\033[1;32m[%s][%3ds] ✅ READY - %s\033[0m\n" "$NOW" "$ELAPSED" "$line"
  elif [[ "$line" == *"○ Compiling"* ]]; then
    printf "\033[1;33m[%s][%3ds] 🔄 COMPILING - %s\033[0m\n" "$NOW" "$ELAPSED" "$line"
  elif [[ "$line" == *"✓ Compiled"* ]]; then
    printf "\033[1;36m[%s][%3ds] ✅ COMPILED - %s\033[0m\n" "$NOW" "$ELAPSED" "$line"
  elif [[ "$line" == *"error"* ]] || [[ "$line" == *"Error"* ]]; then
    printf "\033[1;31m[%s][%3ds] ❌ ERROR - %s\033[0m\n" "$NOW" "$ELAPSED" "$line"
  elif [[ "$line" == *"warning"* ]] || [[ "$line" == *"Warning"* ]]; then
    printf "\033[1;33m[%s][%3ds] ⚠️  %s\033[0m\n" "$NOW" "$ELAPSED" "$line"
  elif [[ "$line" == *"GET"* ]] || [[ "$line" == *"POST"* ]]; then
    printf "\033[1;34m[%s][%3ds] 🌐 %s\033[0m\n" "$NOW" "$ELAPSED" "$line"
  else
    printf "[%s][%3ds] %s\n" "$NOW" "$ELAPSED" "$line"
  fi
done
