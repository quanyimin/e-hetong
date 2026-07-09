#!/bin/bash
# ===========================================
# 多多合同管家 - 数据库初始化脚本
# ===========================================
# 使用方式:
#   1. 先在 Supabase 后台创建项目
#   2. 获取 PostgreSQL 连接串
#   3. 运行此脚本
#
# Supabase 项目地址:
#   https://supabase.com/dashboard/project/vaevfrzlnjwacsaafkiu
#
# 连接串格式:
#   postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres
# ===========================================

echo "===== 多多合同管家 数据库初始化 ====="
echo ""
echo "📌 请先在浏览器打开 Supabase 后台："
echo "   https://supabase.com/dashboard/project/vaevfrzlnjwacsaafkiu"
echo ""
echo "📌 获取数据库连接串："
echo "   项目设置 → Database → Connection string → URI"
echo ""

# 提示用户输入连接串
read -p "请输入 PostgreSQL 连接串: " DATABASE_URL

if [ -z "$DATABASE_URL" ]; then
  echo "❌ 连接串不能为空"
  exit 1
fi

echo ""
echo "🚀 正在初始化数据库..."

# 使用生产数据库 URL 运行 Prisma
DATABASE_URL="$DATABASE_URL" npx prisma db push

echo ""
if [ $? -eq 0 ]; then
  echo "✅ 数据库初始化成功！"
else
  echo "❌ 数据库初始化失败，请检查连接串"
fi
