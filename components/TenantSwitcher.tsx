'use client';

import * as React from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Building2,
  User,
  Users,
  Plus,
  ArrowRightLeft,
  Store,
  Home,
  Briefcase,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

const TENANT_TYPE_ICONS: Record<string, React.ReactNode> = {
  PERSONAL: <Home className="h-4 w-4" />,
  INDIVIDUAL: <Store className="h-4 w-4" />,
  ENTERPRISE: <Building2 className="h-4 w-4" />,
};

const TENANT_TYPE_LABELS: Record<string, string> = {
  PERSONAL: '个人',
  INDIVIDUAL: '个体工商户',
  ENTERPRISE: '企业',
};

const SCENE_TYPE_LABELS: Record<string, string> = {
  GENERAL: '通用',
  LANDLORD_RENT: '房东收租',
  RESTAURANT: '餐饮门店',
  RETAIL: '零售',
  CONSTRUCTION: '建筑',
  SERVICE: '服务',
  LOGISTICS: '物流',
  EDUCATION: '教育',
  HEALTHCARE: '医疗',
  OTHER: '其他',
};

export function TenantSwitcher() {
  const { tenant, tenantList, switchTenant } = useAuth();
  const [open, setOpen] = useState(false);

  if (!tenant || tenantList.length === 0) {
    return null;
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          {TENANT_TYPE_ICONS[tenant.sceneType] || <Building2 className="h-4 w-4" />}
          <span className="hidden sm:inline">{tenant.tenantName}</span>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            ({SCENE_TYPE_LABELS[tenant.sceneType] || '通用'})
          </span>
          <ArrowRightLeft className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          切换主体
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {tenantList.map((t) => (
          <DropdownMenuItem
            key={t.tenantId}
            onClick={() => {
              switchTenant(t.tenantId);
              setOpen(false);
            }}
            className={`cursor-pointer ${tenant.tenantId === t.tenantId ? 'bg-primary/10 text-primary' : ''}`}
          >
            <div className="flex items-center gap-3 w-full">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                tenant.tenantId === t.tenantId ? 'bg-primary' : 'bg-muted'
              }`}>
                {TENANT_TYPE_ICONS[t.sceneType] || <Building2 className="h-4 w-4 text-white" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{t.tenantName}</p>
                <p className="text-xs text-muted-foreground">
                  {SCENE_TYPE_LABELS[t.sceneType] || '通用'} · {t.role === 'OWNER' ? '所有者' : t.role === 'ADMIN' ? '管理员' : t.role === 'MANAGER' ? '管理者' : '查看者'}
                </p>
              </div>
              {tenant.tenantId === t.tenantId && (
                <div className="h-2 w-2 rounded-full bg-primary" />
              )}
            </div>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="text-primary">
          <Button variant="ghost" className="w-full justify-start gap-2">
            <Plus className="h-4 w-4" />
            添加新主体
          </Button>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}