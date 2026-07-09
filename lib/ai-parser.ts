/**
 * 合同 AI 解析服务 V3 - 商用版
 * 精准提取：金额（最高优先级）、甲乙双方、日期、关键词
 */

import { aiConfig } from './ai-config';

export interface ParsedContract {
  contractName: string;
  contractType: string;
  partyA: string;
  partyB: string;
  amount: number | null;
  amountText: string;
  startDate: string;
  endDate: string;
  keyClauses: string[];
  riskAlerts: string[];
  summary: string;
  keywords: string[];
}

const SYSTEM_PROMPT = `你是一个合同解析专家。请从合同原文中提取关键信息，以JSON格式返回（不要markdown，不要代码块）。

{
  "contractName": "合同完整名称",
  "contractType": "合同类型（从以下选择：买卖合同/租赁合同/劳动合同/服务合同/借款合同/承揽合同/技术合同/保密协议/合伙协议/其他）",
  "partyA": "甲方（委托方/买方/出租方）全称",
  "partyB": "乙方（受托方/卖方/承租方）全称",
  "amount": 合同总金额（数字，单位元，找不到填null）,
  "amountText": "金额原文（如'人民币伍拾捌万元整'、'¥580,000'、'58万'、'叁佰贰拾万元'，找不到填null）",
  "startDate": "开始日期 YYYY-MM-DD",
  "endDate": "结束日期/到期日 YYYY-MM-DD",
  "keyClauses": ["条款1", "条款2"],
  "riskAlerts": ["风险1", "风险2"],
  "summary": "一句话摘要（20字内）",
  "keywords": ["关键词1", "关键词2", "关键词3"]
}

**金额提取规则（最高优先级，必须执行）：**
1. 扫描全文所有涉及"金额、总价、合同价、费用、租金、价款、¥、元、人民币、定金、货款"的地方
2. 数字转元：58万→580000，120万元→1200000，贰佰万→2000000，200万→2000000
3. 一定要填写 amount（纯数字）和 amountText（原文），两个字段都要填
4. 如果原文有多个金额（如分期），取合同总金额或合计金额
5. amount必须为纯数字，不要带逗号
6. **中文大写数字也要正确转换**：叁佰贰拾万→3200000，伍仟元→5000，壹拾贰万→120000

**日期规则：**
- "2024年1月1日"→"2024-01-01"
- "2024/1/1"→"2024-01-01"
- "一年"→推算具体日期`;

export async function parseContract(
  ocrText: string,
  fileName?: string,
): Promise<{ success: boolean; data?: ParsedContract; error?: string }> {
  if (!aiConfig.isConfigured()) {
    return { success: false, error: 'AI 未配置，请在 .env 中设置 API Key' };
  }

  if (!ocrText || ocrText.trim().length < 10) {
    return { success: false, error: '合同文本太短' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000); // 30 秒超时

  try {
    const response = await fetch(`${aiConfig.getBaseUrl()}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aiConfig.getApiKey()}`,
      },
      body: JSON.stringify({
        model: aiConfig.getModel(),
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `文件名：${fileName || '未知'}\n\n合同原文：\n${ocrText}` },
        ],
        temperature: 0.01,
        max_tokens: 2000,
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

    // 解析 JSON
    const jsonStr = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed: ParsedContract = JSON.parse(jsonStr);

    // 金额后处理：从金额原文提取数字
    if (parsed.amount === null && parsed.amountText) {
      let cleaned = parsed.amountText.replace(/[，,]/g, '').trim();
      // 中文大写数字转阿拉伯数字
      const chnNumMap: Record<string, number> = { '零': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '壹': 1, '贰': 2, '叁': 3, '肆': 4, '伍': 5, '陆': 6, '柒': 7, '捌': 8, '玖': 9, '拾': 10, '佰': 100, '仟': 1000 };
      // 尝试提取阿拉伯数字
      const nums = cleaned.match(/(\d+(?:\.\d+)?)/);
      if (nums) {
        parsed.amount = parseFloat(nums[1]);
        if (cleaned.includes('万') && parsed.amount < 100000) {
          parsed.amount = parsed.amount * 10000;
        }
        if (cleaned.includes('亿') && parsed.amount < 100000000) {
          parsed.amount = parsed.amount * 100000000;
        }
      } else if (/[零一二三四五六七八九壹贰叁肆伍陆柒捌玖拾佰仟]/.test(cleaned)) {
        // 中文大写数字兜底：识别"X万"、"X元"等模式
        const chnMatch = cleaned.match(/([零一二三四五六七八九壹贰叁肆伍陆柒捌玖拾佰仟]+)\s*万/);
        if (chnMatch) {
          let total = 0;
          let temp = 0;
          for (const ch of chnMatch[1]) {
            const val = chnNumMap[ch] || 0;
            if (val >= 10) { temp = (temp || 1) * val; }
            else { temp = val; }
          }
          total = (total + temp) * 10000;
          parsed.amount = total;
        }
      }
    }

    return { success: true, data: parsed };
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof DOMException && error.name === 'AbortError') {
      return { success: false, error: 'AI 解析超时（30秒），请检查网络或切换模型后重试' };
    }
    return { success: false, error: error instanceof Error ? error.message : '解析异常' };
  }
}
