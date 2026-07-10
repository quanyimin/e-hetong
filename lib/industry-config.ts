// 行业和合同类型的配置定义
// 用于动态表单渲染 + AI 生成合同的参数注入

export interface ContractTypeField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'textarea' | 'select';
  required: boolean;
  placeholder?: string;
  options?: { label: string; value: string }[];
}

export interface ContractTypeConfig {
  code: string;
  name: string;
  description: string;
  fields: ContractTypeField[];
  aiPromptExtra: string;  // 附加到AI prompt的行业/类型特定说明
}

export interface IndustryConfig {
  code: string | null;
  name: string;
  contractTypes: ContractTypeConfig[];
}

const BASE_FIELDS: ContractTypeField[] = [
  { key: 'partyA', label: '甲方（全称）', type: 'text', required: true, placeholder: '请输入甲方名称' },
  { key: 'partyB', label: '乙方（全称）', type: 'text', required: true, placeholder: '请输入乙方名称' },
];

const MONEY_FIELDS: ContractTypeField[] = [
  { key: 'amount', label: '合同金额（元）', type: 'number', required: false, placeholder: '如 50000' },
];

const DATE_FIELDS: ContractTypeField[] = [
  { key: 'startDate', label: '开始日期', type: 'date', required: true },
  { key: 'endDate', label: '结束日期', type: 'date', required: false },
];

const TERM_FIELD: ContractTypeField = { key: 'term', label: '合同期限', type: 'text', required: false, placeholder: '如：1年、3个月、2026-01-01至2026-12-31' };

const RENT_FIELDS: ContractTypeField[] = [
  { key: 'deposit', label: '押金（元）', type: 'number', required: false, placeholder: '如 10000' },
  { key: 'propertyAddress', label: '物业地址', type: 'text', required: true, placeholder: '如：北京市朝阳区XX路XX号' },
  { key: 'area', label: '面积（㎡）', type: 'number', required: false, placeholder: '如 120' },
  { key: 'paymentMethod', label: '支付方式', type: 'select', required: false, options: [{ label: '月付', value: 'MONTHLY' }, { label: '季付', value: 'QUARTERLY' }, { label: '半年付', value: 'SEMI_ANNUAL' }, { label: '年付', value: 'ANNUAL' }] },
];

export const INDUSTRY_CONFIGS: IndustryConfig[] = [
  {
    code: 'LANDLORD',
    name: '房东/租赁',
    contractTypes: [
      {
        code: 'LEASE_HOUSE', name: '住宅租赁合同', description: '适用于住宅房屋租赁',
        fields: [...BASE_FIELDS, ...RENT_FIELDS, { key: 'monthlyRent', label: '月租金（元）', type: 'number', required: true, placeholder: '如 5000' }, ...DATE_FIELDS],
        aiPromptExtra: '这是一份住宅租赁合同，甲方为出租方，乙方为承租方。注意：需明确押金退还条件、维修责任划分、水电气费用承担方式。包含租金、押金、租期、物业地址、面积等信息。',
      },
      {
        code: 'LEASE_COMMERCIAL', name: '商业租赁合同', description: '适用于商铺/写字楼商业租赁',
        fields: [...BASE_FIELDS, ...RENT_FIELDS, { key: 'monthlyRent', label: '月租金（元）', type: 'number', required: true, placeholder: '如 15000' }, { key: 'rentIncrease', label: '租金递增条款', type: 'text', required: false, placeholder: '如：每年递增5%' }, ...DATE_FIELDS],
        aiPromptExtra: '这是一份商业租赁合同，甲方为出租方，乙方为承租方。需包含：租金递增条款、免租期、装修条款、转租条款、物业费承担。商铺/写字楼商业用途。',
      },
      {
        code: 'LEASE_EQUIPMENT', name: '设备租赁合同', description: '适用于各类设备租赁',
        fields: [...BASE_FIELDS, { key: 'equipmentName', label: '设备名称/型号', type: 'text', required: true, placeholder: '如：挖掘机 XCMG-300' }, { key: 'quantity', label: '数量', type: 'number', required: true, placeholder: '如 2' }, { key: 'monthlyRent', label: '月租金（元）', type: 'number', required: true, placeholder: '如 8000' }, { key: 'deposit', label: '押金（元）', type: 'number', required: false, placeholder: '如 20000' }, ...DATE_FIELDS],
        aiPromptExtra: '这是一份设备租赁合同，甲方为出租方，乙方为承租方。需包含：设备规格型号、交付与归还地点、正常损耗标准、维修保养责任、损毁赔偿标准。',
      },
    ],
  },
  {
    code: 'RESTAURANT',
    name: '餐饮门店',
    contractTypes: [
      {
        code: 'PURCHASE_FOOD', name: '食材采购合同', description: '适用于餐厅与供应商批量采购',
        fields: [...BASE_FIELDS, ...MONEY_FIELDS, { key: 'deliveryAddress', label: '配送地址', type: 'text', required: true, placeholder: '餐厅地址' }, { key: 'deliveryFrequency', label: '配送频次', type: 'select', required: false, options: [{ label: '每日配送', value: 'DAILY' }, { label: '隔日配送', value: 'EVERY_OTHER_DAY' }, { label: '每周配送', value: 'WEEKLY' }, { label: '按需配送', value: 'ON_DEMAND' }] }, ...DATE_FIELDS],
        aiPromptExtra: '这是一份食材采购合同，甲方为餐厅/采购方，乙方为食材供应方。需包含：食材规格标准、保质期要求、食品安全责任（极其重要）、配送时效要求、验收标准。注意卫生许可证和食品经营许可证资质要求。',
      },
      {
        code: 'FRANCHISE', name: '品牌加盟合同', description: '适用于餐饮品牌加盟',
        fields: [...BASE_FIELDS, { key: 'brandName', label: '品牌名称', type: 'text', required: true, placeholder: '如：XX麻辣烫' }, { key: 'franchiseFee', label: '加盟费（元）', type: 'number', required: true, placeholder: '如 50000' }, { key: 'deposit', label: '保证金（元）', type: 'number', required: false, placeholder: '如 20000' }, { key: 'managementFee', label: '管理费（元/年）', type: 'number', required: false, placeholder: '如 10000' }, ...DATE_FIELDS],
        aiPromptExtra: '这是一份品牌加盟合同，甲方为品牌方，乙方为加盟方。需包含：品牌授权范围、加盟费、保证金、品牌管理费、选址与装修标准、运营标准与培训支持、供货体系要求、续约与退出条款。',
      },
    ],
  },
  {
    code: 'TECH',
    name: '科技互联网',
    contractTypes: [
      {
        code: 'SOFTWARE_DEV', name: '软件开发合同', description: '适用于定制软件开发项目',
        fields: [...BASE_FIELDS, ...MONEY_FIELDS, { key: 'projectScope', label: '开发内容', type: 'textarea', required: true, placeholder: '功能模块、技术栈、交付物等' }, { key: 'milestones', label: '里程碑节点', type: 'textarea', required: false, placeholder: '各阶段交付时间' }, { key: 'techStack', label: '技术栈要求', type: 'text', required: false, placeholder: '如：React + Node.js + PostgreSQL' }, ...DATE_FIELDS],
        aiPromptExtra: '这是一份软件开发合同，甲方为委托方，乙方为开发方。需包含：开发内容与功能范围、技术栈、里程碑与交付时间、验收标准与测试、源代码归属与知识产权、维护期与技术支持、保密条款。注意知识产权归属条款是核心。',
      },
      {
        code: 'SAAS', name: 'SaaS服务协议', description: '适用于软件即服务订阅模式',
        fields: [...BASE_FIELDS, { key: 'serviceName', label: '服务名称', type: 'text', required: true, placeholder: '如：XX企业管理系统' }, { key: 'subscriptionFee', label: '订阅费用（元/年）', type: 'number', required: true, placeholder: '如 12000' }, { key: 'userCount', label: '授权用户数', type: 'number', required: false, placeholder: '如 50' }, { key: 'serviceLevel', label: '服务等级(SLA)', type: 'textarea', required: false, placeholder: '可用性99.9%、响应时间等' }, ...DATE_FIELDS],
        aiPromptExtra: '这是一份SaaS服务协议，甲方为服务提供方，乙方为订阅方。需包含：服务内容与功能、订阅费用与计费周期、授权用户数、SLA服务等级承诺、数据安全与隐私、服务终止与数据导出、续约与取消条款。',
      },
      {
        code: 'TECH_DEVELOPMENT', name: '技术委托开发合同', description: '适用于技术研发外包',
        fields: [...BASE_FIELDS, ...MONEY_FIELDS, { key: 'techRequirements', label: '技术要求', type: 'textarea', required: true, placeholder: '技术指标、性能参数等' }, { key: 'deliverables', label: '交付成果', type: 'textarea', required: true, placeholder: '源代码、文档、部署手册等' }, { key: 'ipOwnership', label: '知识产权归属', type: 'text', required: true, placeholder: '如：全部归甲方所有' }, ...DATE_FIELDS],
        aiPromptExtra: '这是一份技术委托开发合同，甲方为委托方，乙方为研发方。需包含：技术需求与指标、研发周期与里程碑、交付物清单、知识产权归属（核心条款）、研发经费与支付、验收与测试、保密义务。',
      },
    ],
  },
  {
    code: 'TRADE',
    name: '贸易零售',
    contractTypes: [
      {
        code: 'PURCHASE_SALE', name: '购销合同', description: '适用于大宗商品买卖',
        fields: [...BASE_FIELDS, ...MONEY_FIELDS, { key: 'productName', label: '商品名称/规格', type: 'text', required: true, placeholder: '如：500ml装矿泉水' }, { key: 'quantity', label: '数量', type: 'number', required: true, placeholder: '如 1000' }, { key: 'unit', label: '单位', type: 'text', required: false, placeholder: '如：箱、个、吨' }, { key: 'deliveryDate', label: '交货日期', type: 'date', required: true }, { key: 'deliveryLocation', label: '交货地点', type: 'text', required: true, placeholder: '如：甲方仓库' }],
        aiPromptExtra: '这是一份购销合同，甲方为卖方，乙方为买方。需包含：商品名称规格、数量与单位、单价与总价、交货时间地点、验收标准、付款方式与账期、质量保证期、退换货条款、违约责任。',
      },
      {
        code: 'AGENCY_SALE', name: '代理销售合同', description: '适用于代理销售合作',
        fields: [...BASE_FIELDS, { key: 'productLine', label: '代理产品线', type: 'textarea', required: true, placeholder: '代理产品范围' }, { key: 'territory', label: '代理区域', type: 'text', required: true, placeholder: '如：华东地区' }, { key: 'salesTarget', label: '销售目标（元）', type: 'number', required: false, placeholder: '如 1000000' }, { key: 'commission', label: '佣金比例(%)', type: 'number', required: true, placeholder: '如 15' }, ...DATE_FIELDS],
        aiPromptExtra: '这是一份代理销售合同，甲方为品牌方/供货方，乙方为代理商。需包含：代理产品范围、代理区域与独家性、销售目标、佣金比例与结算方式、市场推广责任、最低采购量、合同续约条件。',
      },
      {
        code: 'SUPPLY', name: '供货合同', description: '适用于长期供货合作',
        fields: [...BASE_FIELDS, ...MONEY_FIELDS, { key: 'supplyItems', label: '供货清单', type: 'textarea', required: true, placeholder: '品类、规格、价格' }, { key: 'supplyCycle', label: '供货周期', type: 'text', required: false, placeholder: '如：每月1号' }, { key: 'paymentTerms', label: '结算账期', type: 'select', required: false, options: [{ label: '月结30天', value: 'NET30' }, { label: '月结60天', value: 'NET60' }, { label: '现结', value: 'CASH' }, { label: '预付款', value: 'PREPAY' }] }, ...DATE_FIELDS],
        aiPromptExtra: '这是一份供货合同，甲方为供应商，乙方为采购方。需包含：供货清单与价格、供货周期与频次、结算账期、最低订单量、品质保证、迟延交付违约金、价格调整机制。',
      },
    ],
  },
  {
    code: 'CONSTRUCTION',
    name: '建筑工程',
    contractTypes: [
      {
        code: 'CONSTRUCTION_WORK', name: '建设工程施工合同', description: '适用于建筑工程施工',
        fields: [...BASE_FIELDS, { key: 'projectName', label: '工程名称', type: 'text', required: true, placeholder: '如：XX大厦建设项目' }, { key: 'projectLocation', label: '工程地点', type: 'text', required: true, placeholder: '详细地址' }, { key: 'contractPrice', label: '合同价款（元）', type: 'number', required: true, placeholder: '如 5000000' }, { key: 'duration', label: '工期（天）', type: 'number', required: true, placeholder: '如 180' }, { key: 'qualityStandard', label: '质量标准', type: 'text', required: false, placeholder: '如：合格/优良/国家标准' }, ...DATE_FIELDS],
        aiPromptExtra: '这是一份建设工程施工合同，甲方为发包方，乙方为承包方。需包含：工程概况（名称、地点、内容）、合同价款与支付方式、工期与进度计划、质量标准与验收、安全生产责任、工程变更程序、竣工结算、质量保修期、违约责任。注意应引用《建设工程施工合同》示范文本通用条款。',
      },
      {
        code: 'SUBCONTRACT', name: '工程分包合同', description: '适用于专业工程分包',
        fields: [...BASE_FIELDS, { key: 'mainProject', label: '总包工程名称', type: 'text', required: true, placeholder: '总包工程' }, { key: 'subcontractScope', label: '分包范围', type: 'textarea', required: true, placeholder: '如：消防工程/水电安装等' }, { key: 'subcontractPrice', label: '分包价款（元）', type: 'number', required: true, placeholder: '如 800000' }, { key: 'subDuration', label: '分包工期（天）', type: 'number', required: true, placeholder: '如 90' }, ...DATE_FIELDS],
        aiPromptExtra: '这是一份工程分包合同，甲方为总承包方，乙方为分包方。需包含：分包范围与内容、分包价款与支付、分包工期、质量验收标准、安全责任划分、总包管理配合、材料供应责任。注意：分包须经业主同意，主体结构不得分包。',
      },
      {
        code: 'DESIGN', name: '工程设计合同', description: '适用于建筑工程设计',
        fields: [...BASE_FIELDS, ...MONEY_FIELDS, { key: 'projectInfo', label: '项目概况', type: 'textarea', required: true, placeholder: '建设规模、用地面积等' }, { key: 'designStage', label: '设计阶段', type: 'text', required: false, placeholder: '如：方案设计/初步设计/施工图设计' }, { key: 'designFee', label: '设计费（元）', type: 'number', required: true, placeholder: '如 300000' }, { key: 'deliveryStandard', label: '交付标准', type: 'textarea', required: false, placeholder: '图纸目录、设计说明等' }, ...DATE_FIELDS],
        aiPromptExtra: '这是一份工程设计合同，甲方为建设单位，乙方为设计单位。需包含：项目概况与设计范围、设计阶段与内容、设计费与支付方式、设计文件交付时间与标准、双方协作义务、设计变更处理、知识产权归属、违约责任。',
      },
    ],
  },
  {
    code: 'EDUCATION',
    name: '教育培训',
    contractTypes: [
      {
        code: 'TRAINING', name: '培训服务合同', description: '适用于教育培训服务',
        fields: [...BASE_FIELDS, ...MONEY_FIELDS, { key: 'courseName', label: '课程名称', type: 'text', required: true, placeholder: '如：Python编程进阶班' }, { key: 'classHours', label: '课时数', type: 'number', required: true, placeholder: '如 48' }, { key: 'teachingMode', label: '授课方式', type: 'select', required: false, options: [{ label: '线下授课', value: 'OFFLINE' }, { label: '线上直播', value: 'ONLINE_LIVE' }, { label: '录播', value: 'RECORDED' }, { label: '混合授课', value: 'BLENDED' }] }, { key: 'refundPolicy', label: '退费规则', type: 'textarea', required: false, placeholder: '如：开课前全额退，开课后按比例' }, ...DATE_FIELDS],
        aiPromptExtra: '这是一份培训服务合同，甲方为培训机构，乙方为学员/委托方。需包含：课程名称与内容、课时安排、授课方式、培训费用与支付方式、退费规则（核心条款）、学员考勤管理、证书颁发、免责条款。注意退费规则应符合当地教育部门要求。',
      },
      {
        code: 'COURSE', name: '课程购买协议', description: '适用于在线课程购买',
        fields: [...BASE_FIELDS, ...MONEY_FIELDS, { key: 'courseList', label: '购买课程清单', type: 'textarea', required: true, placeholder: '课程名称、单价、数量' }, { key: 'accessPeriod', label: '学习有效期', type: 'text', required: false, placeholder: '如：12个月' }, { key: 'refundRule', label: '退款规则', type: 'textarea', required: false, placeholder: '如：购买后7天内无条件退款' }],
        aiPromptExtra: '这是一份在线课程购买协议，甲方为课程提供方，乙方为购买方。需包含：课程清单与价格、学习有效期、用户账户与使用规则、退款政策、知识产权保护（课程内容版权）、数据隐私保护、服务暂停与终止条款。',
      },
    ],
  },
  {
    code: null,
    name: '通用',
    contractTypes: [
      {
        code: 'PURCHASE', name: '采购合同', description: '适用于商品/服务采购',
        fields: [...BASE_FIELDS, ...MONEY_FIELDS, { key: 'subject', label: '采购内容', type: 'textarea', required: true, placeholder: '如：办公桌椅50套，电脑20台' }, ...DATE_FIELDS],
        aiPromptExtra: '这是一份通用采购合同。需包含：采购内容明细、数量与价格、交付时间地点、验收标准、付款方式、质量保证、违约责任。',
      },
      {
        code: 'SERVICE', name: '服务合同', description: '适用于专业服务外包',
        fields: [...BASE_FIELDS, ...MONEY_FIELDS, { key: 'serviceScope', label: '服务内容', type: 'textarea', required: true, placeholder: '如：品牌策划、网站开发、法律顾问等' }, ...DATE_FIELDS],
        aiPromptExtra: '这是一份服务合同。需包含：服务内容与范围、服务期限、服务费用与支付方式、双方权利义务、验收标准、保密条款、违约责任。',
      },
      {
        code: 'LABOR', name: '劳动合同', description: '适用于企业与员工签订',
        fields: [...BASE_FIELDS, { key: 'position', label: '岗位/职位', type: 'text', required: true, placeholder: '如：前端开发工程师' }, { key: 'salary', label: '月薪（元）', type: 'number', required: true, placeholder: '如 15000' }, { key: 'probation', label: '试用期（月）', type: 'number', required: false, placeholder: '如 2' }, ...DATE_FIELDS],
        aiPromptExtra: '这是一份固定期限劳动合同。需包含：合同期限（固定期限）、工作内容与地点、劳动报酬（基本工资+绩效）、社会保险、工作时间与休假、劳动保护、合同变更与解除条件。注意试用期约定应符合劳动合同法。',
      },
      {
        code: 'NDA', name: '保密协议', description: '适用于双方保密信息保护',
        fields: [...BASE_FIELDS, { key: 'confidentialScope', label: '保密范围', type: 'textarea', required: true, placeholder: '如：技术资料、客户名单、财务数据等' }, { key: 'confidentialTerm', label: '保密期限（年）', type: 'number', required: false, placeholder: '如 3' }],
        aiPromptExtra: '这是一份双方保密协议（NDA）。需包含：保密信息定义与范围、保密期限（合同终止后X年）、保密义务、例外条款（已公开/依法披露等）、违约赔偿责任。注意例外条款的完整表述。',
      },
      {
        code: 'SALE', name: '销售合同', description: '适用于商品销售交易',
        fields: [...BASE_FIELDS, ...MONEY_FIELDS, { key: 'productList', label: '商品清单', type: 'textarea', required: true, placeholder: '商品名称、规格、数量、单价' }, { key: 'deliveryDate', label: '交货日期', type: 'date', required: true }, { key: 'deliveryLocation', label: '交货地点', type: 'text', required: true, placeholder: '如：甲方指定仓库' }],
        aiPromptExtra: '这是一份销售合同。需包含：商品清单（名称/规格/数量/单价）、合同总价、交货时间地点、验收标准与退货条款、付款方式、质量保证期、违约责任、争议解决。',
      },
    ],
  },
];

export function getContractTypes(industryCode: string | null): ContractTypeConfig[] {
  const industry = INDUSTRY_CONFIGS.find(i => i.code === industryCode);
  if (industry) return industry.contractTypes;
  // 如果没找到，返回通用的
  const generic = INDUSTRY_CONFIGS.find(i => i.code === null);
  return generic?.contractTypes || [];
}

export function getFieldConfig(industry: string | null, contractType: string): ContractTypeField[] {
  const types = getContractTypes(industry);
  const ct = types.find(t => t.code === contractType);
  return ct?.fields || [];
}

export function getContractTypeName(industry: string | null, contractType: string): string {
  const types = getContractTypes(industry);
  const ct = types.find(t => t.code === contractType);
  return ct?.name || contractType;
}

export function getIndustryName(code: string | null): string {
  if (code === null) return '通用';
  const industry = INDUSTRY_CONFIGS.find(i => i.code === code);
  return industry?.name || code;
}
