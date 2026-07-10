import prisma from '../lib/prisma';

async function main() {
  const userId = 'user_demo_001';

  const role = await prisma.userTenantRole.findFirst({
    where: { userId, tenant: { type: 'PERSONAL' } },
    select: { tenantId: true },
  });
  const tenant = role ? { id: role.tenantId } : null;
  console.log('个人租户ID:', tenant?.id);

  if (tenant) {
    const result = await prisma.contract.updateMany({
      where: { userId, name: { contains: '【测试】' }, tenantId: null },
      data: { tenantId: tenant.id },
    });
    console.log('更新了', result.count, '条记录');
  }

  // 验证
  const count = await prisma.contract.count({
    where: { userId, name: { contains: '【测试】' } },
  });
  console.log('测试合同总数:', count);
}

main().catch(console.error).finally(() => prisma.$disconnect());
