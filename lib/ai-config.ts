/**
 * ===========================================
 * AI 模型配置中心
 * 所有大模型 API 调用统一从这里读取配置
 * 切换模型只需改这里 + .env 里的 key
 * ===========================================
 *
 * 【使用方式】
 * import { aiConfig } from '@/lib/ai-config';
 * const model = aiConfig.getModel();
 * const apiKey = aiConfig.getApiKey();
 *
 * 【切换模型】
 * .env 中修改：
 *   AI_PROVIDER=openai       # openai | doubao | deepseek | glm | qwen
 *   AI_MODEL=gpt-4o-mini     # 对应模型的版本
 *   AI_API_KEY=sk-xxx         # 对应的 API Key
 */

export type AIProvider = 'openai' | 'longcat' | 'doubao' | 'deepseek' | 'glm' | 'qwen';

export interface AIModelConfig {
  provider: AIProvider;
  displayName: string;
  apiBaseUrl: string;
  defaultModel: string;
  note: string;
}

/** 支持的模型清单 */
export const AI_MODELS: Record<AIProvider, AIModelConfig> = {
  openai: {
    provider: 'openai',
    displayName: 'OpenAI',
    apiBaseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    note: '国外，需翻墙或中转代理',
  },
  longcat: {
    provider: 'longcat',
    displayName: 'LongCat',
    apiBaseUrl: 'https://api.longcat.chat/openai',
    defaultModel: 'LongCat-2.0',
    note: '中转代理，支持多种模型协议',
  },
  doubao: {
    provider: 'doubao',
    displayName: '豆包（字节）',
    apiBaseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    defaultModel: 'doubao-pro-32k',
    note: '国内，无需翻墙，性价比高',
  },
  deepseek: {
    provider: 'deepseek',
    displayName: 'DeepSeek',
    apiBaseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    note: '国内，极便宜，适合批量解析',
  },
  glm: {
    provider: 'glm',
    displayName: '智谱 GLM',
    apiBaseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    defaultModel: 'glm-4-flash',
    note: '国内，稳定可靠',
  },
  qwen: {
    provider: 'qwen',
    displayName: '通义千问（阿里）',
    apiBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    defaultModel: 'qwen-plus',
    note: '国内，阿里云生态',
  },
};

/** 当前使用的 API Key 映射（从 .env 读取） */
const KEY_MAP: Record<AIProvider, string> = {
  openai: process.env.OPENAI_API_KEY || '',
  longcat: process.env.LONGCAT_API_KEY || '',
  doubao: process.env.DOUBAO_API_KEY || '',
  deepseek: process.env.DEEPSEEK_API_KEY || '',
  glm: process.env.GLM_API_KEY || '',
  qwen: process.env.QWEN_API_KEY || '',
};

export const aiConfig = {
  /** 获取当前启用的模型配置 */
  getActiveConfig(): AIModelConfig {
    const provider = (process.env.AI_PROVIDER || 'openai') as AIProvider;
    return AI_MODELS[provider] || AI_MODELS.openai;
  },

  /** 获取当前模型的 API Base URL */
  getBaseUrl(): string {
    return this.getActiveConfig().apiBaseUrl;
  },

  /** 获取当前模型的名称 */
  getModel(): string {
    return process.env.AI_MODEL || this.getActiveConfig().defaultModel;
  },

  /** 获取当前模型的 API Key */
  getApiKey(): string {
    const config = this.getActiveConfig();
    return KEY_MAP[config.provider] || '';
  },

  /** 获取完整的请求头 */
  getHeaders(): Record<string, string> {
    const config = this.getActiveConfig();
    const apiKey = this.getApiKey();

    if (config.provider === 'longcat') {
      return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      };
    }

    if (config.provider === 'glm') {
      return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      };
    }

    // OpenAI 兼容模式
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    };
  },

  /** 检查是否已配 Key */
  isConfigured(): boolean {
    return !!this.getApiKey();
  },
};
