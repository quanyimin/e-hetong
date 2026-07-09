import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 数据库种子数据初始化...');

  // Phase 1: 创建基础行业场景
  const scenes = [
    { code: 'GENERAL',      name: '通用合同',   icon: 'FileText',     route: '/dashboard/contracts', sortOrder: 0 },
    { code: 'RESTAURANT',   name: '餐饮行业',   icon: 'Utensils',     route: '/dashboard/scenes/restaurant', sortOrder: 10 },
    { code: 'LANDLORD',     name: '房东租赁',   icon: 'Building2',    route: '/dashboard/scenes/landlord', sortOrder: 20 },
    { code: 'LOGISTICS',    name: '物流运输',   icon: 'Truck',        route: '/dashboard/scenes/logistics', sortOrder: 30 },
    { code: 'CONSTRUCTION', name: '建筑工程',   icon: 'HardHat',      route: '/dashboard/scenes/construction', sortOrder: 40 },
    { code: 'RETAIL',       name: '零售贸易',   icon: 'ShoppingCart', route: '/dashboard/scenes/retail', sortOrder: 50 },
    { code: 'HR',           name: '人力资源',   icon: 'Users',        route: '/dashboard/scenes/hr', sortOrder: 60 },
    { code: 'IT_SERVICE',   name: 'IT服务',     icon: 'Monitor',      route: '/dashboard/scenes/it', sortOrder: 70 },
    { code: 'MEDICAL',      name: '医疗健康',   icon: 'HeartPulse',   route: '/dashboard/scenes/medical', sortOrder: 80 },
    { code: 'EDUCATION',    name: '教育培训',   icon: 'GraduationCap', route: '/dashboard/scenes/education', sortOrder: 90 },
    { code: 'REAL_ESTATE',  name: '房地产',     icon: 'Home',         route: '/dashboard/scenes/realestate', sortOrder: 100 },
  ];

  for (const scene of scenes) {
    await prisma.industryScene.upsert({
      where: { code: scene.code },
      update: { name: scene.name, icon: scene.icon, route: scene.route, sortOrder: scene.sortOrder },
      create: scene,
    });
  }

  console.log('✅ 行业场景初始化完成');
  console.log(`   - 共 ${scenes.length} 个行业场景`);

  // 创建通用行业版本
  const generalVersion = await prisma.industryVersion.upsert({
    where: { code: 'V_GENERAL' },
    update: {},
    create: {
      code: 'V_GENERAL',
      name: '通用版',
      icon: 'LayoutDashboard',
      description: '适合大多数企业的通用合同管理功能',
      sortOrder: 0,
    },
  });

  console.log('✅ 行业版本初始化完成');

  // 将通用场景关联到通用版本
  const defaultScenes = await prisma.industryScene.findMany({ where: { code: { in: ['GENERAL'] } } });
  for (const scene of defaultScenes) {
    await prisma.industryVersionScene.upsert({
      where: { versionId_sceneId: { versionId: generalVersion.id, sceneId: scene.id } },
      update: {},
      create: { versionId: generalVersion.id, sceneId: scene.id, isDefault: true, sortOrder: 0 },
    });
  }

  console.log('✅ 场景-版本关联初始化完成');
  console.log('🎉 种子数据初始化全部完成');
}

main()
  .catch((e) => {
    console.error('❌ 种子数据初始化失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
