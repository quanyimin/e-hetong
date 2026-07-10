import prisma from '../lib/prisma';

/**
 * 测试数据脚本：创建用于验证合同台账的测试合同
 * 使用方式：npx tsx scripts/seed-ledger-test.ts
 */
async function main() {
  const userId = 'user_demo_001';

  // 找到用户的个人租户
  const personalTenant = await prisma.tenant.findFirst({
    where: { type: 'PERSONAL', userTenantRoles: { some: { userId } } },
    select: { id: true },
  });
  const tenantId = personalTenant?.id;
  console.log('个人租户ID:', tenantId);

  // 清理旧的测试数据（可选）
  // await prisma.contract.deleteMany({ where: { userId, name: { contains: '【测试】' } } });

  const now = new Date();
  const makeDate = (daysFromNow: number) => new Date(now.getTime() + daysFromNow * 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const testContracts = [
    // ===== 收入类（INCOME）=====
    {
      name: '【测试】深圳科技有限公司销售合同',
      type: 'sale',
      partyA: '易合同科技有限公司',
      partyB: '深圳科技有限公司',
      amount: 128000,
      direction: 'INCOME',
      status: 'ACTIVE',
      startDate: startOfMonth,
      endDate: makeDate(5),
    },
    {
      name: '【测试】广州网络公司服务合同',
      type: 'service',
      partyA: '易合同科技有限公司',
      partyB: '广州网络科技有限公司',
      amount: 36000,
      direction: 'INCOME',
      status: 'ACTIVE',
      startDate: startOfMonth,
      endDate: makeDate(12),
    },
    {
      name: '【测试】北京数据科技软件服务合同',
      type: 'service',
      partyA: '易合同科技有限公司',
      partyB: '北京数据科技有限公司',
      amount: 88000,
      direction: 'INCOME',
      status: 'ACTIVE',
      startDate: startOfMonth,
      endDate: makeDate(25),
    },
    {
      name: '【测试】上海贸易公司年度服务合同',
      type: 'service',
      partyA: '易合同科技有限公司',
      partyB: '上海贸易有限公司',
      amount: 58000,
      direction: 'INCOME',
      status: 'SIGNING',
      startDate: startOfMonth,
      endDate: makeDate(45),
    },

    // ===== 支出类（EXPENSE）=====
    {
      name: '【测试】办公室租赁合同',
      type: 'lease',
      partyA: '北京物业有限公司',
      partyB: '易合同科技有限公司',
      amount: 24000,
      direction: 'EXPENSE',
      status: 'ACTIVE',
      startDate: startOfMonth,
      endDate: makeDate(3),
    },
    {
      name: '【测试】服务器采购合同',
      type: 'sale',
      partyA: '云服务厂商',
      partyB: '易合同科技有限公司',
      amount: 45000,
      direction: 'EXPENSE',
      status: 'ACTIVE',
      startDate: startOfMonth,
      endDate: makeDate(10),
    },
    {
      name: '【测试】员工劳动合同-张三',
      type: 'labor',
      partyA: '易合同科技有限公司',
      partyB: '张三',
      amount: 180000,
      direction: 'EXPENSE',
      status: 'ACTIVE',
      startDate: startOfMonth,
      endDate: makeDate(20),
    },
    {
      name: '【测试】设计外包服务合同',
      type: 'service',
      partyA: '设计工作室',
      partyB: '易合同科技有限公司',
      amount: 15000,
      direction: 'EXPENSE',
      status: 'DRAFT',
      startDate: startOfMonth,
      endDate: makeDate(50),
    },

    // ===== 往年数据（用于年统计）=====
    {
      name: '【测试】2025年度框架合作协议',
      type: 'service',
      partyA: '易合同科技有限公司',
      partyB: '某大型客户',
      amount: 360000,
      direction: 'INCOME',
      status: 'CLOSED',
      startDate: new Date(now.getFullYear() - 1, 0, 1),
      endDate: new Date(now.getFullYear() - 1, 11, 31),
      createdAt: new Date(now.getFullYear() - 1, 0, 1),
    },
    {
      name: '【测试】2025年办公场地租赁',
      type: 'lease',
      partyA: '物业公司',
      partyB: '易合同科技有限公司',
      amount: 288000,
      direction: 'EXPENSE',
      status: 'CLOSED',
      startDate: new Date(now.getFullYear() - 1, 0, 1),
      endDate: new Date(now.getFullYear() - 1, 11, 31),
      createdAt: new Date(now.getFullYear() - 1, 0, 1),
    },
  ];

  console.log(`开始创建 ${testContracts.length} 条测试合同...`);

  for (const c of testContracts) {
    const created = await prisma.contract.create({
      data: {
        userId,
        tenantId,
        identityType: 'PERSONAL',
        ...c,
        createdAt: c.createdAt || undefined,
      },
    });
    console.log(`  ✓ ${created.name} (${c.direction} ¥${c.amount?.toLocaleString()})`);
  }

  console.log('\n测试数据创建完成！');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
