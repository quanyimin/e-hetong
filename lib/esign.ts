// 电子签章集成库（e签宝风格接口），支持 Mock 模式开发
// 正式接入时仅需替换 mock 实现为真实 API 调用

export interface EsignConfig {
  appId: string;
  secret: string;
  apiUrl: string;
}

export interface EsignSignParams {
  contractId: string;
  contractName: string;
  signers: Array<{
    name: string;
    idCard: string;
    phone: string;
    signType: 'SINGLE' | 'SEQUENT';
  }>;
  fileUrl: string;
}

export interface EsignSignResult {
  signFlowId: string;
  signUrl: string;
  status: string;
}

export interface EsignStatusResult {
  status: string;
  signedAt?: string;
}

let cachedConfig: EsignConfig | null = null;

/**
 * 从环境变量加载 e签宝配置
 */
export function getEsignConfig(): EsignConfig {
  if (cachedConfig) return cachedConfig;

  cachedConfig = {
    appId: process.env.ESIGN_APP_ID || '',
    secret: process.env.ESIGN_SECRET || '',
    apiUrl: process.env.ESIGN_API_URL || 'https://openapi.esign.cn',
  };

  return cachedConfig;
}

/**
 * 检查 e签宝是否已配置
 */
export function isEsignConfigured(): boolean {
  const config = getEsignConfig();
  return !!(config.appId && config.secret);
}

/**
 * 创建签署流程
 * - Mock 模式：返回伪造数据，模拟 1 秒延迟
 * - 正式模式：调用 e签宝开放平台 API
 */
export async function createSignFlow(params: EsignSignParams): Promise<EsignSignResult> {
  const config = getEsignConfig();

  if (!isEsignConfigured()) {
    // Mock 模式：模拟签署流程创建
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const mockSignFlowId = `mock-flow-${Date.now()}`;
    return {
      signFlowId: mockSignFlowId,
      signUrl: `https://esign.mock/sign/${mockSignFlowId}`,
      status: 'pending',
    };
  }

  // 正式模式：调用 e签宝 API
  // TODO: 接入真实 e签宝接口
  // const response = await fetch(`${config.apiUrl}/v3/sign-flow/create`, {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json',
  //     'X-Tsign-Open-App-Id': config.appId,
  //     'X-Tsign-Open-Auth-Mode': 'Signature',
  //   },
  //   body: JSON.stringify({ ... }),
  // });

  throw new Error('正式 e签宝 API 尚未接入，请在 .env 中配置 ESIGN_APP_ID 和 ESIGN_SECRET 后使用 Mock 模式');
}

/**
 * 查询签署状态
 */
export async function querySignStatus(signFlowId: string): Promise<EsignStatusResult> {
  if (!isEsignConfigured() || signFlowId.startsWith('mock-')) {
    // Mock 模式：模拟状态查询
    await new Promise((resolve) => setTimeout(resolve, 500));

    return {
      status: 'completed',
      signedAt: new Date().toISOString(),
    };
  }

  // 正式模式：调用 e签宝 API
  // TODO: 接入真实 e签宝接口
  throw new Error('正式 e签宝 API 尚未接入');
}

/**
 * 获取已签署文件下载地址
 */
export async function downloadSignedFile(signFlowId: string): Promise<string> {
  if (!isEsignConfigured() || signFlowId.startsWith('mock-')) {
    // Mock 模式：返回模拟下载地址
    return `https://esign.mock/download/${signFlowId}.pdf`;
  }

  // 正式模式：调用 e签宝 API
  // TODO: 接入真实 e签宝接口
  throw new Error('正式 e签宝 API 尚未接入');
}
