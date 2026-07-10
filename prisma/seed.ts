import { PrismaClient } from '@prisma/client';
import { SEED_TEMPLATES } from '../lib/templates/seed-templates';

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

  // Phase 2: 创建行业插件定价数据
  console.log('\n🔌 开始创建行业插件...');

  const industryPlugins = [
    { code: 'GENERAL', name: '通用合同管理', description: '基础合同模板+AI解析，适用所有行业', icon: 'FileText', price: 0, isPaid: false },
    { code: 'LANDLORD', name: '房东/物业租赁', description: '收租台账、押金管理、水电读数、房源管理', icon: 'Building2', price: 188, isPaid: true },
    { code: 'RESTAURANT', name: '餐饮门店', description: '食材采购、供应商管理、菜品定价、卫生证照', icon: 'UtensilsCrossed', price: 188, isPaid: true },
    { code: 'CONSTRUCTION', name: '建筑工程', description: '工程进度台账、材料采购、劳务合同、资质管理', icon: 'HardHat', price: 388, isPaid: true },
    { code: 'RETAIL', name: '贸易零售', description: '进销存合同、供应商管理、对账结算、物流跟踪', icon: 'ShoppingCart', price: 188, isPaid: true },
    { code: 'TECH', name: '科技互联网', description: '软件授权、技术服务、项目外包、知识产权', icon: 'Monitor', price: 288, isPaid: true },
    { code: 'EDUCATION', name: '教育培训', description: '课程合同、学员合同、教师合同、退费管理', icon: 'GraduationCap', price: 188, isPaid: true },
    { code: 'MEDICAL', name: '医疗健康', description: '诊疗合同、设备采购、药品采购、合规管理', icon: 'HeartPulse', price: 388, isPaid: true },
    { code: 'LOGISTICS', name: '物流运输', description: '运输合同、仓储合同、运单管理、车辆资产', icon: 'Truck', price: 288, isPaid: true },
    { code: 'AGRICULTURE', name: '农业合作社', description: '农产品购销、土地流转、合作社管理', icon: 'Sprout', price: 188, isPaid: true },
    { code: 'LIFESTYLE', name: '生活服务', description: '家政合同、维修合同、美容服务合同', icon: 'Wrench', price: 88, isPaid: true },
  ];

  for (const plugin of industryPlugins) {
    const scene = await prisma.industryScene.findUnique({ where: { code: plugin.code } });

    await prisma.pluginDefinition.upsert({
      where: { code: plugin.code },
      update: { price: plugin.price, isPaid: plugin.isPaid, description: plugin.description, icon: plugin.icon },
      create: {
        code: plugin.code,
        name: plugin.name,
        description: plugin.description,
        icon: plugin.icon,
        type: plugin.code === 'GENERAL' ? 'SYSTEM' : 'INDUSTRY',
        price: plugin.price,
        isPaid: plugin.isPaid,
        status: 'active',
        sceneId: scene?.id || null,
      },
    });
  }

  console.log(`✅ 行业插件初始化完成，共 ${industryPlugins.length} 个插件`);

  // Phase 3: 填充行业模板
  console.log('\n📋 开始填充行业模板...');

  // 查找行业场景ID
  const landlord = await prisma.industryScene.findFirst({ where: { code: 'LANDLORD' } });
  const restaurant = await prisma.industryScene.findFirst({ where: { code: 'RESTAURANT' } });

  let created = 0;
  let skipped = 0;

  for (const tpl of SEED_TEMPLATES) {
    // 检查是否已存在同名模板
    const existing = await prisma.contractTemplate.findFirst({
      where: { name: tpl.name, type: tpl.type },
    });

    if (existing) {
      skipped++;
      continue;
    }

    // 确定 sceneId
    let sceneId: string | undefined;
    if (tpl.industry === 'LANDLORD' && landlord) sceneId = landlord.id;
    else if (tpl.industry === 'RESTAURANT' && restaurant) sceneId = restaurant.id;

    await prisma.contractTemplate.create({
      data: {
        name: tpl.name,
        industry: tpl.industry,
        type: tpl.type,
        description: tpl.description,
        content: tpl.content,
        isOfficial: tpl.isOfficial,
        usageCount: tpl.usageCount,
        sceneId,
      },
    });
    created++;
  }

  console.log(`✅ 模板填充完成！新建 ${created} 个模板，跳过 ${skipped} 个已存在模板。`);
  console.log(`   - 总计：${SEED_TEMPLATES.length} 个模板（通用5类 + 房东6类 + 餐饮6类）`);

  // 显示按行业汇总
  const total = await prisma.contractTemplate.count();
  const byIndustry = await prisma.contractTemplate.groupBy({
    by: ['industry'],
    _count: true,
  });
  console.log('\n📊 模板库汇总:');
  byIndustry.forEach(g => {
    console.log(`   - ${g.industry || '通用'}: ${g._count} 个`);
  });
  console.log(`   - 总计: ${total} 个`);

  console.log('\n🎉 种子数据初始化全部完成');
}

main()
  .catch((e) => {
    console.error('❌ 种子数据初始化失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
