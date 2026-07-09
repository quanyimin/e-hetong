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
    } else {
      localStorage.removeItem(TENANT_STORAGE_KEY);
      setCookie(TENANT_COOKIE_NAME, null);
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
      router.push('/dashboard');
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

  const value: AuthContextType = {
    user,
    tenant,
    tenantList,
    loading,
    login,
    register,
    logout,
    switchTenant,
    updateUser,
    isLoggedIn: !!user,
    isAdmin: user?.role === 'admin',
    isOwner: tenant?.role === 'OWNER',
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