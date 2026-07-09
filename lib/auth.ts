import prisma from '@/lib/prisma';

export interface AuthUser {
  id: string; name: string; email: string | null; phone: string | null;
  role: string; memberLevel: string;
}

const DEMO_USERS: Record<string, { password: string; id: string; name: string; email: string; phone: string; role: string; memberLevel: string }> = {
  'demo@e-hetong.com': { password: 'demo123', id: 'user_demo_001', name: '张经理', email: 'demo@e-hetong.com', phone: '13800000002', role: 'user', memberLevel: 'free' },
  '13800000002': { password: 'demo123', id: 'user_demo_001', name: '张经理', email: 'demo@e-hetong.com', phone: '13800000002', role: 'user', memberLevel: 'free' },
  'admin@e-hetong.com': { password: 'admin123', id: 'user_admin_001', name: '管理员', email: 'admin@e-hetong.com', phone: '13800000001', role: 'admin', memberLevel: 'pro' },
  '13800000001': { password: 'admin123', id: 'user_admin_001', name: '管理员', email: 'admin@e-hetong.com', phone: '13800000001', role: 'admin', memberLevel: 'pro' },
};

export async function authenticate(account: string, password: string): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
  const user = DEMO_USERS[account];
  if (!user || user.password !== password) return { success: false, error: '账号或密码错误' };

  try {
    await prisma.user.upsert({
      where: { id: user.id },
      update: {},
      create: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, memberLevel: user.memberLevel },
    });
  } catch { /* 忽略 */ }

  return { success: true, user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, memberLevel: user.memberLevel } };
}

export async function register(params: { name: string; email?: string; phone?: string; password: string; inviteCode?: string }): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
  try {
    if (params.email) { const e = await prisma.user.findUnique({ where: { email: params.email } }); if (e) return { success: false, error: '该邮箱已被注册' }; }
    if (params.phone) { const p = await prisma.user.findUnique({ where: { phone: params.phone } }); if (p) return { success: false, error: '该手机号已被注册' }; }

    const user = await prisma.user.create({
      data: { name: params.name, email: params.email || null, phone: params.phone || null, memberLevel: 'free', role: 'user' },
    });

    const key = params.email || params.phone || '';
    DEMO_USERS[key] = { password: params.password, id: user.id, name: params.name, email: params.email || '', phone: params.phone || '', role: 'user', memberLevel: 'free' };

    return { success: true, user: { id: user.id, name: params.name, email: params.email || null, phone: params.phone || null, role: 'user', memberLevel: 'free' } };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : '注册失败' };
  }
}
