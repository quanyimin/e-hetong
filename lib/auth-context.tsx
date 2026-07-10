'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';

export interface AuthUser {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  memberLevel: string;
  avatarUrl?: string | null;
}

export interface TenantInfo {
  tenantId: string;
  tenantName: string;
  role: string;
  sceneType: string;
  /** 身份类型 PERSONAL | ENTERPRISE（从场景类型自动推导） */
  identityType: string;
}

interface AuthContextType {
  user: AuthUser | null;
  tenant: TenantInfo | null;
  tenantList: TenantInfo[];
  loading: boolean;
  login: (account: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (params: {
    name: string;
    email?: string;
    phone?: string;
    password: string;
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  switchTenant: (tenantId: string) => void;
  updateUser: (data: Partial<AuthUser>) => void;
  isLoggedIn: boolean;
  isAdmin: boolean;
  isOwner: boolean;
  /** 当前身份类型 */
  identityType: string;
}

const COOKIE_NAME = 'ehetong_auth';
const TENANT_COOKIE_NAME = 'ehetong_tenant';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60;

function setCookie(name: string, value: string | null) {
  if (typeof document === 'undefined') return;
  if (value) {
    const secureFlag = process.env.NODE_ENV === 'production' ? 'Secure;' : '';
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax; ${secureFlag}`;
  } else {
    document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
  }
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'ehetong_auth';
const TENANT_STORAGE_KEY = 'ehetong_tenant';
const TENANT_LIST_KEY = 'ehetong_tenant_list';

function loadUserFromStorage(): AuthUser | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return null;
}

function loadTenantFromStorage(): TenantInfo | null {
  try {
    const stored = localStorage.getItem(TENANT_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return null;
}

function loadTenantListFromStorage(): TenantInfo[] {
  try {
    const stored = localStorage.getItem(TENANT_LIST_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return [];
}

function saveUserToStorage(user: AuthUser | null) {
  try {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      setCookie(COOKIE_NAME, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
      setCookie(COOKIE_NAME, null);
    }
  } catch { /* ignore */ }
}

function saveTenantToStorage(tenant: TenantInfo | null) {
  try {
    if (tenant) {
      localStorage.setItem(TENANT_STORAGE_KEY, JSON.stringify(tenant));
      setCookie(TENANT_COOKIE_NAME, tenant.tenantId);
      // 同步设置身份类型 + 组织ID cookie（供服务端中间件读取）
      setCookie('ehetong_identityType', tenant.identityType || 'PERSONAL');
      setCookie('ehetong_orgId', tenant.tenantId);
      setCookie('ehetong_userId', (() => {
        try {
          const u = localStorage.getItem('ehetong_user');
          return u ? JSON.parse(u).id : '';
        } catch { return ''; }
      })());
    } else {
      localStorage.removeItem(TENANT_STORAGE_KEY);
      setCookie(TENANT_COOKIE_NAME, null);
      setCookie('ehetong_identityType', null);
      setCookie('ehetong_orgId', null);
    }
  } catch { /* ignore */ }
}

function saveTenantListToStorage(list: TenantInfo[]) {
  try {
    localStorage.setItem(TENANT_LIST_KEY, JSON.stringify(list));
  } catch { /* ignore */ }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [tenant, setTenant] = React.useState<TenantInfo | null>(null);
  const [tenantList, setTenantList] = React.useState<TenantInfo[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const savedUser = loadUserFromStorage();
    const savedTenant = loadTenantFromStorage();
    const savedTenantList = loadTenantListFromStorage();
    
    setUser(savedUser);
    setTenant(savedTenant);
    setTenantList(savedTenantList);
    setLoading(false);
  }, []);

  const login = async (account: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account, password }),
      });
      const data = await res.json();

      if (!data.success) {
        setLoading(false);
        return { success: false, error: data.error || '登录失败' };
      }

      const authUser: AuthUser = data.user;
      const tenants: TenantInfo[] = data.tenantAccess || [];

      saveUserToStorage(authUser);
      saveTenantListToStorage(tenants);
      setUser(authUser);
      setTenantList(tenants);

      if (tenants.length > 0) {
        saveTenantToStorage(tenants[0]);
        setTenant(tenants[0]);
      }

      setLoading(false);

      const redirect = new URLSearchParams(window.location.search).get('redirect');
      router.push(redirect || '/dashboard');

      return { success: true };
    } catch {
      setLoading(false);
      return { success: false, error: '网络错误' };
    }
  };

  const register = async (params: {
    name: string;
    email?: string;
    phone?: string;
    password: string;
  }): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await res.json();

      if (!data.success) {
        setLoading(false);
        return { success: false, error: data.error || '注册失败' };
      }

      const authUser: AuthUser = data.user;
      const tenants: TenantInfo[] = data.tenantAccess || [];

      saveUserToStorage(authUser);
      saveTenantListToStorage(tenants);
      setUser(authUser);
      setTenantList(tenants);

      if (tenants.length > 0) {
        saveTenantToStorage(tenants[0]);
        setTenant(tenants[0]);
      }

      setLoading(false);
      router.push('/dashboard');

      return { success: true };
    } catch {
      setLoading(false);
      return { success: false, error: '网络错误' };
    }
  };

  const logout = () => {
    saveUserToStorage(null);
    saveTenantToStorage(null);
    saveTenantListToStorage([]);
    setUser(null);
    setTenant(null);
    setTenantList([]);
    router.push('/');
  };

  const switchTenant = (tenantId: string) => {
    const target = tenantList.find((t) => t.tenantId === tenantId);
    if (target) {
      saveTenantToStorage(target);
      setTenant(target);
      // 清空前端缓存（防止跨身份数据残留）
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('dashboard_cache');
        const keysToRemove: string[] = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const k = sessionStorage.key(i);
          if (k) keysToRemove.push(k);
        }
        keysToRemove.forEach(k => {
          if (k.startsWith('dash_') || k.startsWith('contracts_') || k.startsWith('cache_')) {
            sessionStorage.removeItem(k);
          }
        });
      }
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/dashboard';
      router.replace(currentPath);
    }
  };

  const updateUser = (data: Partial<AuthUser>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...data };
      saveUserToStorage(updated);
      return updated;
    });
  };

  // 推导身份类型：个人场景 → PERSONAL，其他 → ENTERPRISE
  const deriveIdentityType = (sceneType?: string): 'PERSONAL' | 'ENTERPRISE' => {
    return (!sceneType || sceneType === 'GENERAL' || sceneType === 'PERSONAL') ? 'PERSONAL' : 'ENTERPRISE';
  };

  const currentIdentityType = deriveIdentityType(tenant?.sceneType);

  // 确保列表中的每个 tenant 都有 identityType
  const enrichedTenantList = React.useMemo(
    () => tenantList.map(t => ({ ...t, identityType: t.identityType || deriveIdentityType(t.sceneType) })),
    [tenantList]
  );

  const value: AuthContextType = {
    user,
    tenant: tenant ? { ...tenant, identityType: tenant.identityType || deriveIdentityType(tenant.sceneType) } : null,
    tenantList: enrichedTenantList,
    loading,
    login,
    register,
    logout,
    switchTenant,
    updateUser,
    isLoggedIn: !!user,
    isAdmin: user?.role === 'admin',
    isOwner: tenant?.role === 'OWNER',
    identityType: currentIdentityType,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}