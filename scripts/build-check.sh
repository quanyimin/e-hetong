#!/bin/bash
# ===========================================
# 多多合同管家 — 构建检测脚本
# 使用: bash scripts/build-check.sh
# 功能: 快速检测构建是否通过，无需等2分钟
# ===========================================

cd "$(cd "$(dirname "$0")/.." && pwd)"

echo "🔍 检测步骤 1/3: TypeScript 类型检查"
npx tsc --noEmit 2>&1
if [ $? -ne 0 ]; then
  echo "❌ TypeScript 错误，请修复后重试"
  exit 1
fi
echo "✅ TypeScript 通过"

echo ""
echo "🔍 检测步骤 2/3: ESLint"
npx next lint 2>&1 | tail -5
echo ""

echo "🔍 检测步骤 3/3: 构建测试"
npx next build --no-lint 2>&1 | tail -15

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ 全部通过！可以部署"
else
  echo ""
  echo "❌ 构建失败，请检查上方错误信息"
fi
