# 易合同 - 生产部署指南

## 一、服务器架构概览

```
用户 → CDN(国内) → Nginx(反向代理) → Next.js(PM2) → PostgreSQL
                                          ↓
                                   文件存储(OSS/本地)
                                          ↓
                                   AI解析(OpenAI API/本地模型)
```

## 二、服务器推荐配置

| 用户量 | CPU | 内存 | 硬盘 | 带宽 | 参考价格/月 |
|--------|-----|------|------|------|------------|
| < 1000 企业 | 2核 | 4G | 40G+ | 5M | ¥100-200 |
| < 5000 企业 | 4核 | 8G | 80G+ | 10M | ¥300-500 |
| > 5000 企业 | 8核 | 16G | 200G+ | 20M | ¥800+ |

### 推荐云服务商（国内）
- **阿里云** - ecs.t5-c1m2.large 或 ecs.g7.large
- **腾讯云** - 标准型 S5/S6
- **华为云** - 通用计算增强型 C6

> ⚠️ 部署在国内服务器需要 ICP 备案域名

## 三、数据库选型

### 方案 A：云数据库 PostgreSQL（推荐）
```
阿里云 RDS PostgreSQL 14+
腾讯云 PostgreSQL 14+
最简配置: 2核4G 50GB SSD ≈ ¥100/月
```

### 方案 B：Supabase 国内替代
Supabase 是国外服务，国内访问慢。推荐替代：
| 服务 | 特点 | 价格 |
|------|------|------|
| 腾讯云 TC PostgreSQL | 兼容性好，有免费额度 | 按量付费 |
| 阿里云 RDS PostgreSQL | 国内最大云数据库 | ¥100+/月 |
| 自建 Docker PostgreSQL | 灵活可控 | 服务器费用 |

### 数据库迁移步骤
```bash
# 1. 修改 prisma/schema.prisma 的 datasource
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")  # 连接池用
}

# 2. 修改字段类型（SQLite → PostgreSQL）
#    Float? → Decimal?          (金额)
#    String? → Json?            (parsedData)
#    String? → String[]         (tags)

# 3. 生成迁移
npx prisma migrate dev --name init

# 4. 应用到生产数据库
npx prisma migrate deploy
```

## 四、环境变量配置

```bash
# 生产环境 .env.production
NEXT_PUBLIC_APP_URL=https://your-domain.com
NODE_ENV=production

# PostgreSQL 数据库（阿里云/腾讯云 RDS）
DATABASE_URL="postgresql://user:password@your-rds-host:5432/ehetong?schema=public"
DIRECT_URL="postgresql://user:password@your-rds-host:5432/ehetong?schema=public"

# 文件存储（阿里云OSS / 腾讯云COS）
# 替代 Supabase Storage
NEXT_PUBLIC_STORAGE_PROVIDER=aliyun-oss
ALIYUN_OSS_ACCESS_KEY=your_oss_key
ALIYUN_OSS_SECRET_KEY=your_oss_secret
ALIYUN_OSS_BUCKET=ehetong-files
ALIYUN_OSS_REGION=oss-cn-hangzhou

# AI 解析（OpenAI API / 国产大模型）
OPENAI_API_KEY=your_key
OPENAI_MODEL=gpt-4o-mini
# 国产替代：文心一言 / 通义千问 / DeepSeek
# AI_PROVIDER=doubao
# DOUBAO_API_KEY=your_key

# 支付（国内）
PAYMENT_PROVIDER=wechat  # wechat | alipay
PAYMENT_APP_ID=your_app_id
PAYMENT_MCH_ID=your_mch_id
PAYMENT_API_KEY=your_api_key
```

## 五、部署步骤

### 1. 服务器基础配置
```bash
# 安装 Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs nginx

# 安装 PM2
npm install -g pm2

# 安装 PostgreSQL（如用自建）
apt-get install -y postgresql-14
```

### 2. 部署应用
```bash
# 克隆代码
git clone https://your-repo/e-hetong.git
cd e-hetong

# 安装依赖
npm install --production

# 设置环境变量
cp .env.example .env.local
# 编辑 .env.local 填入生产环境值

# 切换 Prisma 为 PostgreSQL
# 修改 prisma/schema.prisma 的 provider = "postgresql"

# 生产构建
npm run build

# 启动（PM2）
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 3. Nginx 配置
```nginx
# /etc/nginx/sites-available/ehetong
upstream ehetong {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/ssl/certs/your-domain.pem;
    ssl_certificate_key /etc/ssl/private/your-domain.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # 静态资源缓存
    location /_next/static {
        alias /var/www/ehetong/.next/static;
        expires 365d;
        add_header Cache-Control "public, immutable";
    }

    location / {
        proxy_pass http://ehetong;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # 上传文件大小限制
    client_max_body_size 20M;
}
```

### 4. PM2 配置
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'e-hetong',
    script: 'node_modules/next/dist/bin/next',
    args: 'start',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    instances: 2,          // CPU 核心数
    exec_mode: 'cluster',  // 集群模式
    max_memory_restart: '500M',
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
  }]
};
```

## 六、国内部署特别注意事项

### 1. ICP 备案
- 国内服务器必须 ICP 备案
- 备案时间：约 10-20 个工作日
- 建议提前办理，不备案域名会被拦截

### 2. CDN 加速
```
推荐使用国内 CDN：
- 阿里云 CDN / 腾讯云 CDN / 又拍云
- 静态资源（_next/static）走 CDN 加速
- 动态 API 直连服务器
```

### 3. 数据库连接池
```bash
# 使用 PgBouncer 连接池
# 或 Prisma 内置连接池
DATABASE_URL="postgresql://user:password@host:5432/ehetong?connection_limit=10&pool_timeout=10"
```

### 4. 文件存储替代方案
| 方案 | 特点 | 价格 |
|-----|------|------|
| 阿里云 OSS | 国内最成熟 | 按量付费，便宜 |
| 腾讯云 COS | 兼容 S3 API | 50GB 免费 |
| 本地磁盘 | 简单、免费 | 需做备份 |

### 5. AI 模型国产替代
```
Supabase 的 AI 功能 → 国产大模型 API
- 智谱 GLM-4  (性价比高)
- 百度文心 4.0
- 阿里通义千问
- 字节豆包
- DeepSeek V3 (便宜)
```

### 6. 微信生态集成
```bash
# 微信登录
WECHAT_APP_ID=wx_xxx
WECHAT_APP_SECRET=xxx

# 微信公众号模板消息（到期提醒）
WECHAT_TEMPLATE_ID=xxx

# 微信支付
WECHAT_PAY_MCH_ID=xxx
WECHAT_PAY_API_KEY=xxx
```

## 七、监控与运维

### 1. 日志查看
```bash
# PM2 日志
pm2 logs e-hetong

# Nginx 日志
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### 2. 健康检查
```bash
# 添加 API 健康检查路由
curl https://your-domain.com/api/health
```

### 3. 数据库备份
```bash
# 每天凌晨备份
0 3 * * * pg_dump -U user ehetong > /backup/ehetong_$(date +\%Y\%m\%d).sql
```

### 4. 监控推荐
- **阿里云 CloudMonitor** - 服务器基础监控
- **Sentry** - 前端错误监控
- **UptimeRobot** - 可用性监控
- **PM2 Metrics** - 进程监控

## 八、一键部署脚本

```bash
#!/bin/bash
# deploy.sh - 生产部署脚本

echo "🚀 开始部署易合同..."

# 1. 拉取最新代码
git pull origin main

# 2. 安装依赖
npm install --production

# 3. 数据库迁移
npx prisma migrate deploy

# 4. 构建
npm run build

# 5. 重启服务
pm2 reload ecosystem.config.js

echo "✅ 部署完成！"
```
