/**
 * ===========================================
 * 定时任务 - 到期提醒检查 API
 * ===========================================
 * 用于 Vercel Cron Jobs 或外部定时触发器调用。
 *
 * 【Vercel Cron Jobs 配置】
 * 在 vercel.json 中添加：
 * {
 *   "crons": [{
 *     "path": "/api/cron/reminder",
 *     "schedule": "0 2 * * *"
 *   }]
 * }
 *
 * 【安全机制】
 * 通过 CRON_SECRET 密钥验证调用来源
 *
 * 【测试调用】
 * curl -X GET "http://localhost:3000/api/cron/reminder?secret=your-cron-secret"
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkExpiringContracts } from '@/lib/reminder-service';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const secret = request.nextUrl.searchParams.get('secret');

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ code: 401, message: '未授权访问' }, { status: 401 });
  }

  console.log(`[Cron] 到期提醒检查开始 - ${new Date().toISOString()}`);

  try {
    const result = await checkExpiringContracts();
    const duration = Date.now() - startTime;

    console.log(`[Cron] 检查完成 - 耗时 ${duration}ms`);

    return NextResponse.json({
      code: 0,
      message: 'success',
      data: { ...result, duration: `${duration}ms`, timestamp: new Date().toISOString() },
    });
  } catch (error) {
    console.error('[Cron] 检查失败:', error);
    return NextResponse.json(
      { code: 1, message: '检查失败', error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}
