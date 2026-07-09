// lib/adaptive.ts
// 自适应三界面渲染引擎 — 根据用户层级自动切换界面复杂度

export type UserTier = 'personal' | 'sme' | 'enterprise';

export interface AdaptiveConfig {
  tier: UserTier;
  maxContracts: number;
  maxMembers: number;
  maxTenants: number;
  aiParseLimit: number;
  semanticSearch: boolean;
  aiDiagnosis: boolean;
  aiContractGen: boolean;
  approvalFlow: boolean;
  sealManagement: boolean;
  auditLog: boolean;
  openApi: 'none' | 'read' | 'full';
  industryPluginLimit: number;
  privateDeployment: boolean;
}

export const TIER_CONFIGS: Record<UserTier, AdaptiveConfig> = {
  personal: {
    tier: 'personal',
    maxContracts: 50,
    maxMembers: 1,
    maxTenants: 1,
    aiParseLimit: 30,
    semanticSearch: false,
    aiDiagnosis: false,
    aiContractGen: false,
    approvalFlow: false,
    sealManagement: false,
    auditLog: false,
    openApi: 'none',
    industryPluginLimit: 0,
    privateDeployment: false,
  },
  sme: {
    tier: 'sme',
    maxContracts: 99999,
    maxMembers: 5,
    maxTenants: 2,
    aiParseLimit: 500,
    semanticSearch: false,
    aiDiagnosis: false,
    aiContractGen: false,
    approvalFlow: false,
    sealManagement: false,
    auditLog: false,
    openApi: 'read',
    industryPluginLimit: 2,
    privateDeployment: false,
  },
  enterprise: {
    tier: 'enterprise',
    maxContracts: 99999,
    maxMembers: 99999,
    maxTenants: 99999,
    aiParseLimit: 99999,
    semanticSearch: true,
    aiDiagnosis: true,
    aiContractGen: true,
    approvalFlow: true,
    sealManagement: true,
    auditLog: true,
    openApi: 'full',
    industryPluginLimit: 999,
    privateDeployment: true,
  },
};

export function getTierFromMemberLevel(level: string): UserTier {
  switch (level) {
    case 'free':
    case 'personal':
      return 'personal';
    case 'sme':
    case 'pro':
    case 'professional':
      return 'sme';
    case 'enterprise':
    case 'corporate':
      return 'enterprise';
    default:
      return 'personal';
  }
}

export function getTierFromTenantType(type: string): UserTier {
  switch (type) {
    case 'PERSONAL':
      return 'personal';
    case 'INDIVIDUAL':
      return 'sme';
    case 'ENTERPRISE':
    case 'BRANCH':
      return 'enterprise';
    default:
      return 'personal';
  }
}

export function getConfig(level: string, tenantType?: string): AdaptiveConfig {
  // tenant type overrides member level for enterprise
  if (tenantType === 'ENTERPRISE' || tenantType === 'BRANCH') {
    return TIER_CONFIGS.enterprise;
  }
  return TIER_CONFIGS[getTierFromMemberLevel(level)];
}

// 检查某项功能是否可用
export function can(feature: keyof AdaptiveConfig, level: string, tenantType?: string): boolean {
  const config = getConfig(level, tenantType);
  const value = config[feature];
  if (typeof value === 'number') return value > 0;
  return Boolean(value);
}
