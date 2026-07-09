/**
 * ===========================================
 * 合同到期提醒 - 定时任务脚本
 * ===========================================
 *
 * 【功能】
 * 每天凌晨自动扫描即将到期的合同（未来7天内），
 * 根据提醒规则（提前7天/3天/1天）生成提醒记录并发送通知。
 *
 * 【部署方式一：Node.js Cron】
 *   npx ts-node --transpile-only scripts/reminder-cron.ts
 *
 * 【部署方式二：PM2】
 *   pm2 start scripts/reminder-cron.ts --name "reminder-cron" --interpreter npx --interpreter-args "ts-node --transpile-only"
 *
 * 【部署方式三：Linux Crontab】
 *   0 2 * * * cd /path/to/project && npx ts-node --transpile-only scripts/reminder-cron.ts >> logs/reminder-cron.log 2>&1
 *
 * 【部署方式四：Vercel Cron Jobs】
 *   使用 app/api/cron/reminder/route.ts
 *
 * 【测试运行】
 *   npx ts-node --transpile-only scripts/reminder-cron.ts --dry-run
 */

import { checkExpiringContracts } from '../lib/reminder-service';

const isDryRun = process.argv.includes('--dry-run');

async function main() {
  const startTime = Date.now();

  console.log(`\n══════════════════════════════════════════`);
  console.log(`  易合同 - 到期提醒定时任务`);
  console.log(`  执行时间：${new Date().toLocaleString('zh-CN')}`);
  console.log(`  运行模式：${isDryRun ? '🔍 试运行' : '🚀 正式运行'}`);
  console.log(`══════════════════════════════════════════\n`);

  if (isDryRun) {
    console.log('⚠️  试运行模式：仅扫描，不发送通知\n');
  }

  try {
    const result = await checkExpiringContracts();
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`\n══════════════════════════════════════════`);
    console.log(`  ✅ 任务执行完毕`);
    console.log(`  ⏱  耗时：${duration}秒`);
    console.log(`  📊 扫描合同：${result.total} 份`);
    console.log(`  ✅ 生成提醒：${result.created} 条`);
    console.log(`  ❌ 发送失败：${result.failed} 条`);
    console.log(`══════════════════════════════════════════\n`);

    if (result.details.length > 0) {
      console.log('详细结果：');
      console.table(result.details);
    }

    process.exit(result.failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('\n❌ 定时任务执行失败:', error);
    process.exit(1);
  }
}

main();
