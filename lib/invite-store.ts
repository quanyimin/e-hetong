// 邀请码内存存储（生产环境应迁移至 Redis 或数据库）
export interface InviteRecord {
  code: string;
  tenantId: string;
  role: string;
  createdBy: string;
  createdAt: Date;
  expiresAt: Date;
  used: boolean;
  usedBy?: string;
  usedAt?: Date;
}

const store = new Map<string, InviteRecord>();

// 生成随机邀请码（8 位字母数字组合）
function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function createInvite(
  tenantId: string,
  role: string,
  createdBy: string,
  ttlMs: number = 7 * 24 * 60 * 60 * 1000 // 默认 7 天有效期
): InviteRecord {
  let code = generateCode();
  // 避免碰撞
  while (store.has(code)) {
    code = generateCode();
  }

  const now = new Date();
  const record: InviteRecord = {
    code,
    tenantId,
    role,
    createdBy,
    createdAt: now,
    expiresAt: new Date(now.getTime() + ttlMs),
    used: false,
  };

  store.set(code, record);
  return record;
}

export function getInvite(code: string): InviteRecord | undefined {
  return store.get(code);
}

export function useInvite(code: string, userId: string): boolean {
  const record = store.get(code);
  if (!record) return false;
  if (record.used) return false;
  if (new Date() > record.expiresAt) return false;

  record.used = true;
  record.usedBy = userId;
  record.usedAt = new Date();
  return true;
}
