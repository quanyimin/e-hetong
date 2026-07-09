#!/bin/bash
# ===========================================
# 多多合同管家 - Vercel 部署脚本
# ===========================================
# 完整部署流程：
#   1. 先登录 Vercel
#   2. 在 Supabase 后台获取数据库连接串
#   3. 运行此脚本
# ===========================================

set -e

echo "===== 多多合同管家 Vercel 部署工具 ====="
echo ""

# 检查 vercel 是否安装
if ! command -v vercel &> /dev/null; then
  echo "❌ vercel 未安装，正在安装..."
  npm install -g vercel
fi

# 检查是否已登录
echo "📌 第一步：登录 Vercel"
echo "   如果尚未登录，请先运行: vercel login"
echo ""

# 提示输入环境变量
echo "📌 第二步：配置环境变量"
echo "   请准备以下信息："
echo "   1. Supabase PostgreSQL 连接串"
echo "   2. Supabase URL (已配置)"
echo "   3. Supabase Anon Key (已配置)"
echo "   4. DeepSeek API Key (已配置)"
echo ""

# 获取用户输入
read -p "Supabase PostgreSQL 连接串: " DB_URL

echo ""
echo "🚀 第三步：部署到 Vercel"
echo ""

# 使用 vercel 部署并设置环境变量
vercel --prod \
  -e DATABASE_URL="$DB_URL" \
  -e NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co" \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key" \
  -e SUPABASE_SERVICE_ROLE_KEY="your-service-role-key" \
  -e AI_PROVIDER="deepseek" \
  -e AI_MODEL="deepseek-chat" \
  -e DEEPSEEK_API_KEY="your-deepseek-api-key" \
  -e CRON_SECRET="e-hetong-cron-secret-2024" \
  -e NEXT_PUBLIC_APP_URL="https://e-hetong.vercel.app"

echo ""
if [ $? -eq 0 ]; then
  echo "✅ 部署成功！"
  echo "   访问地址: https://e-hetong.vercel.app"
  echo ""
  echo "📌 后续步骤："
  echo "   1. 在 Vercel 后台设置自定义域名"
  echo "   2. 配置 Supabase Storage 存储桶"
  echo "   3. 测试所有功能是否正常"
else
  echo "❌ 部署失败，请检查错误信息"
fi
