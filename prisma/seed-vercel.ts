/**
 * Vercel 部署专用种子脚本
 * 在构建阶段执行，创建演示数据
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('[Vercel Seed] 开始初始化演示数据...');

  // 检查是否已有用户
  const userCount = await prisma.user.count();
  if (userCount > 0) {
    console.log(`[Vercel Seed] 已有 ${userCount} 个用户，跳过种子数据`);
    return;
  }

  // 创建演示用户
  const demoUser = await prisma.user.create({
    data: {
      name: '演示用户',
      email: 'demo@e-hetong.com',
      role: 'ADMIN',
    },
  });
  console.log(`[Vercel Seed] 创建演示用户: ${demoUser.id}`);

  // 创建示例合同
  const contracts = [
    { name: '商铺租赁合同（北京朝阳）', partyA: '北京贝库网络科技', partyB: '朝阳区商业管理公司', amount: 360000, type: 'LEASE', startDate: new Date('2026-01-01'), endDate: new Date('2028-12-31'), status: 'ACTIVE' },
    { name: '食材供应合同（七嗦米粉）', partyA: '七嗦米粉餐饮管理', partyB: '新发地农产品配送中心', amount: 480000, type: 'SUPPLY', startDate: new Date('2026-03-01'), endDate: new Date('2027-02-28'), status: 'ACTIVE' },
    { name: '软件开发外包合同', partyA: '北京贝库网络科技', partyB: '深圳极客科技', amount: 150000, type: 'SERVICE', startDate: new Date('2026-05-15'), endDate: new Date('2026-08-15'), status: 'ACTIVE' },
    { name: '企业法律服务合同', partyA: '北京贝库网络科技', partyB: '大成律师事务所', amount: 80000, type: 'SERVICE', startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31'), status: 'ACTIVE' },
    { name: '办公室续租合同', partyA: '北京贝库网络科技', partyB: '国贸物业管理有限公司', amount: 120000, type: 'LEASE', startDate: new Date('2025-06-01'), endDate: new Date('2026-05-31'), status: 'EXPIRED' },
    { name: '员工保密协议（张三）', partyA: '北京贝库网络科技', partyB: '张三', amount: 0, type: 'NDA', startDate: new Date('2026-04-01'), endDate: null, status: 'ACTIVE' },
  ];

  for (const c of contracts) {
    await prisma.contract.create({
      data: {
        userId: demoUser.id,
        name: c.name,
        type: c.type,
        partyA: c.partyA,
        partyB: c.partyB,
        amount: c.amount,
        startDate: c.startDate,
        endDate: c.endDate,
        status: c.status,
        fileType: 'text',
        parseStatus: 'completed',
        searchText: [c.name, c.partyA, c.partyB].filter(Boolean).join(' '),
      },
    });
  }

  console.log(`[Vercel Seed] 创建 ${contracts.length} 个示例合同`);
  console.log('[Vercel Seed] 演示数据初始化完成');
}

main()
  .catch((e) => {
    console.error('[Vercel Seed] 错误:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
