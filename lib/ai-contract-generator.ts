import { aiConfig } from './ai-config';

export interface GenerateContractParams {
  industry: string | null;
  contractType: string;
  contractTypeName: string;
  parameters: Record<string, any>;
  additionalRequirements?: string;
}

export interface GeneratedContract {
  title: string;
  content: string;
  summary: string;
}

function buildSystemPrompt(params: GenerateContractParams): string {
  const { industry, contractTypeName, parameters, additionalRequirements } = params;

  // 构建行业描述
  const industryDesc = industry === 'LANDLORD' ? '（房东/租赁行业）' :
                        industry === 'RESTAURANT' ? '（餐饮行业）' : '（通用行业）';

  // 构建参数文本
  const paramText = Object.entries(parameters)
    .filter(([k, v]) => v && !['additionalRequirements'].includes(k))
    .map(([k, v]) => {
      const labels: Record<string, string> = {
        partyA: '甲方', partyB: '乙方', amount: '合同金额', monthlyRent: '月租金',
        startDate: '开始日期', endDate: '结束日期', term: '合同期限',
        deposit: '押金', propertyAddress: '物业地址', area: '面积',
        paymentMethod: '支付方式', equipmentName: '设备名称', quantity: '数量',
        deliveryAddress: '配送地址', deliveryFrequency: '配送频次',
        brandName: '品牌名称', franchiseFee: '加盟费', managementFee: '管理费',
        subject: '采购内容', serviceScope: '服务内容', position: '岗位',
        salary: '月薪', probation: '试用期', confidentialScope: '保密范围',
        confidentialTerm: '保密期限', productList: '商品清单', deliveryDate: '交货日期',
        deliveryLocation: '交货地点', rentIncrease: '租金递增', rent: '租金',
      };
      return `${labels[k] || k}: ${v}`;
    })
    .join('\n');

  return `你是一位专业的合同律师。请根据以下信息生成一份完整、合法、格式规范的${contractTypeName}${industryDesc}合同。

**用户提供的参数信息（必须包含在合同中）：**
${paramText || '(用户未提供具体参数，请使用通用条款)'}

${additionalRequirements ? `**用户附加要求：**\n${additionalRequirements}\n\n` : ''}

**生成要求：**
1. 合同必须包含以下中文标准章节（按顺序）：
   - 合同标题（居中、加粗、大号字体）
   - 合同双方信息（甲方、乙方的全称、地址、联系方式等）
   - 第一条 合同标的/服务内容/租赁物（根据合同类型调整章节名称）
   - 第二条 合同期限
   - 第三条 合同价款/租金/费用
   - 第四条 支付方式
   - 第五条 双方权利义务
   - 第六条 违约责任
   - 第七条 合同的变更与解除
   - 第八条 争议解决
   - 第九条 其他约定
   - 签署页（甲方（签章）：________________  乙方（签章）：________________  签订日期：________）

2. 格式要求：
   - 使用纯文本格式（markdown），不要用代码块
   - 段落之间空一行
   - 条款编号用中文数字（一、二、三...）
   - 金额数字用中文大写+阿拉伯数字双重标注（如"人民币伍拾万元整（¥500,000）"）

3. 合同条款需合法合规，符合《中华人民共和国民法典》及相关法律法规

4. 合同条款需对双方公平合理，不含明显偏向性条款

5. 如用户未提供某个参数，使用「______」占位符；但核心信息（甲乙方、金额、日期等）必须使用用户提供的参数`;
}

export async function generateContract(
  params: GenerateContractParams
): Promise<{ success: boolean; data?: GeneratedContract; error?: string }> {
  if (!aiConfig.isConfigured()) {
    return { success: false, error: 'AI 未配置，请在 .env 中设置 API Key' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000); // 60秒超时（生成比解析慢）

  try {
    const systemPrompt = buildSystemPrompt(params);

    const response = await fetch(`${aiConfig.getBaseUrl()}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aiConfig.getApiKey()}`,
      },
      body: JSON.stringify({
        model: aiConfig.getModel(),
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `请为我生成一份${params.contractTypeName}合同。${params.additionalRequirements ? `附加要求：${params.additionalRequirements}` : ''}` },
        ],
        temperature: 0.3,  // 中等温度，保证专业性又有一定灵活性
        max_tokens: 4096,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      return { success: false, error: `API (${response.status}): ${errBody.slice(0, 200)}` };
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;
    if (!content) return { success: false, error: 'AI 返回为空' };

    // 提取合同标题（第一行）
    const lines = content.trim().split('\n');
    const title = lines[0].replace(/^#+\s*/, '').replace(/\*\*/g, '').trim() || `${params.contractTypeName}合同`;
    const summary = `由AI生成的${params.contractTypeName}合同，甲方：${params.parameters.partyA || '待定'}，乙方：${params.parameters.partyB || '待定'}`;

    return {
      success: true,
      data: { title, content, summary },
    };
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof DOMException && error.name === 'AbortError') {
      return { success: false, error: 'AI 生成超时（60秒），请简化参数后重试' };
    }
    return { success: false, error: error instanceof Error ? error.message : '生成异常' };
  }
}
