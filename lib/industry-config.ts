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
