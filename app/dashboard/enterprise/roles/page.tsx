'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import {
  Shield,
  Users,
  Loader2,
  KeyRound,
  Save,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type ActionItem = {
  action: string;
  enabled: boolean;
};

type PermissionModule = {
  module: string;
  actions: ActionItem[];
};

type RoleItem = {
  role: string;
  name: string;
  memberCount: number;
  permissions: PermissionModule[];
};

const MODULE_LABELS: Record<string, string> = {
  CONTRACT: '合同管理',
  LICENSE: '证照管理',
  APPROVAL: '审批管理',
};

const ACTION_LABELS: Record<string, string> = {
  VIEW: '查看',
  CREATE: '创建',
  EDIT: '编辑',
  DELETE: '删除',
  APPROVE: '审批',
};

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'from-blue-500 to-blue-600',
  EDITOR: 'from-purple-500 to-purple-600',
  VIEWER: 'from-gray-500 to-gray-600',
};

const ROLE_DESCRIPTIONS: Record<string, string> = {
  ADMIN: '拥有所有模块的完整操作权限，可管理成员与系统配置',
  EDITOR: '可创建和编辑合同、证照，查看审批记录',
  VIEWER: '仅可查看合同、证照和审批记录，无法进行任何操作',
};

function PermissionSwitch({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled: boolean;
}) {
  return (
    <Switch
      checked={checked}
      onCheckedChange={onChange}
      disabled={disabled}
    />
  );
}

export default function EnterpriseRolesPage() {
  const { tenant } = useAuth();
  const tenantId = tenant?.tenantId || 'default';
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modifiedRoles, setModifiedRoles] = useState<Set<string>>(new Set());
  const [expandedRole, setExpandedRole] = useState<string>('ADMIN');

  // 本地编辑的权限副本: role -> module -> action -> boolean
  const [localPermissions, setLocalPermissions] = useState<Map<string, Map<string, Map<string, boolean>>>>(new Map());

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/enterprise/roles?tenantId=${encodeURIComponent(tenantId)}`);
      const data = await res.json();
      const roleList: RoleItem[] = data.roles || [];
      setRoles(roleList);

      // 初始化本地权限副本
      const local = new Map<string, Map<string, Map<string, boolean>>>();
      roleList.forEach(role => {
        const moduleMap = new Map<string, Map<string, boolean>>();
        role.permissions.forEach(mod => {
          const actionMap = new Map<string, boolean>();
          mod.actions.forEach(a => actionMap.set(a.action, a.enabled));
          moduleMap.set(mod.module, actionMap);
        });
        local.set(role.role, moduleMap);
      });
      setLocalPermissions(local);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [tenantId]);

  useEffect(() => { fetchRoles(); }, [fetchRoles]);

  const getActionEnabled = (role: string, module: string, action: string): boolean => {
    return localPermissions.get(role)?.get(module)?.get(action) ?? false;
  };

  const togglePermission = (role: string, module: string, action: string) => {
    setLocalPermissions(prev => {
      const next = new Map(prev);
      const moduleMap = new Map(next.get(role) || new Map());
      const actionMap = new Map(moduleMap.get(module) || new Map());
      actionMap.set(action, !(actionMap.get(action) ?? false));
      moduleMap.set(module, actionMap);
      next.set(role, moduleMap);
      return next;
    });
    setModifiedRoles(prev => new Set(prev).add(role));
  };

  const toggleAllModule = (role: string, module: string, enabled: boolean) => {
    setLocalPermissions(prev => {
      const next = new Map(prev);
      const moduleMap = new Map(next.get(role) || new Map());
      const actionMap = new Map(moduleMap.get(module) || new Map());
      const keys = Array.from(actionMap.keys());
      for (let k = 0; k < keys.length; k++) {
        actionMap.set(keys[k], enabled);
      }
      moduleMap.set(module, actionMap);
      next.set(role, moduleMap);
      return next;
    });
    setModifiedRoles(prev => new Set(prev).add(role));
  };

  const saveRole = async (role: string) => {
    const moduleMap = localPermissions.get(role);
    if (!moduleMap) return;

    setSaving(true);
    try {
      const entries = Array.from(moduleMap.entries());
      for (let i = 0; i < entries.length; i++) {
        const [module, actionMap] = entries[i];
        const actionEntries = Array.from(actionMap.entries());
        const enabledActions: string[] = [];
        for (let j = 0; j < actionEntries.length; j++) {
          if (actionEntries[j][1]) {
            enabledActions.push(actionEntries[j][0]);
          }
        }

        const res = await fetch(`/api/enterprise/roles?tenantId=${encodeURIComponent(tenantId)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role, module, actions: enabledActions }),
        });
        const data = await res.json();
        if (data.code !== 0) {
          toast.error(`保存 ${module} 权限失败: ${data.message}`);
          return;
        }
      }
      toast.success(`${roles.find(r => r.role === role)?.name || role} 权限已更新`);
      setModifiedRoles(prev => {
        const next = new Set(prev);
        next.delete(role);
        return next;
      });
    } catch {
      toast.error('网络错误，保存失败');
    }
    setSaving(false);
  };

  const saveAll = async () => {
    setSaving(true);
    const rolesArr = Array.from(modifiedRoles);
    for (let i = 0; i < rolesArr.length; i++) {
      await saveRole(rolesArr[i]);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">角色与权限</h1>
          <p className="text-sm text-muted-foreground mt-1">管理企业角色及其操作权限</p>
        </div>
        {modifiedRoles.size > 0 && (
          <Button onClick={saveAll} loading={saving}>
            <Save className="h-4 w-4 mr-2" />
            保存全部修改（{modifiedRoles.size}）
          </Button>
        )}
      </div>

      {/* 角色总览卡片 */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        {roles.map((role) => (
          <Card
            key={role.role}
            className={cn(
              'cursor-pointer transition-all hover:shadow-md',
              expandedRole === role.role && 'ring-2 ring-primary'
            )}
            onClick={() => setExpandedRole(role.role)}
          >
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className={cn(
                  'p-2 rounded-lg bg-gradient-to-br text-white',
                  ROLE_COLORS[role.role]
                )}>
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">{role.name}</p>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                    <Users className="h-3 w-3" />
                    <span>{role.memberCount} 人</span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {ROLE_DESCRIPTIONS[role.role]}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 权限详情 */}
      {roles.filter(r => r.role === expandedRole).map((role) => (
        <Card key={`detail-${role.role}`}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <KeyRound className="h-4 w-4" />
                {role.name} — 权限配置
              </CardTitle>
              {modifiedRoles.has(role.role) && (
                <Button size="sm" onClick={() => saveRole(role.role)} loading={saving}>
                  <Save className="h-3.5 w-3.5 mr-1" />
                  保存
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground w-32">模块</th>
                    <th className="text-center px-2 py-3 font-medium text-muted-foreground">全部开关</th>
                    {role.permissions[0]?.actions.map((a) => (
                      <th key={a.action} className="text-center px-2 py-3 font-medium text-muted-foreground min-w-[80px]">
                        {ACTION_LABELS[a.action] || a.action}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {role.permissions.map((mod) => {
                    const allEnabled = mod.actions.every(a =>
                      getActionEnabled(role.role, mod.module, a.action)
                    );
                    const someEnabled = mod.actions.some(a =>
                      getActionEnabled(role.role, mod.module, a.action)
                    );

                    return (
                      <tr key={mod.module} className="border-b last:border-b-0 hover:bg-muted/20">
                        <td className="px-4 py-3 font-medium">{MODULE_LABELS[mod.module] || mod.module}</td>
                        <td className="px-2 py-3 text-center">
                          <Switch
                            checked={allEnabled}
                            onCheckedChange={(checked) => toggleAllModule(role.role, mod.module, checked)}
                            disabled={role.role === 'ADMIN'}
                            className={cn(!allEnabled && someEnabled && 'data-[state=unchecked]:bg-amber-300')}
                          />
                        </td>
                        {mod.actions.map((a) => (
                          <td key={a.action} className="px-2 py-3 text-center">
                            <PermissionSwitch
                              checked={getActionEnabled(role.role, mod.module, a.action)}
                              onChange={() => togglePermission(role.role, mod.module, a.action)}
                              disabled={role.role === 'ADMIN'}
                            />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2 text-xs text-muted-foreground border-t bg-muted/20">
              <Badge variant="outline" className="mr-2">管理员</Badge>
              角色权限固定为全部开启，不可修改
            </div>
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardContent className="p-4 text-sm text-muted-foreground">
          <p className="font-medium mb-1">权限说明</p>
          <ul className="list-disc list-inside space-y-0.5 text-xs">
            <li><strong>合同管理</strong>：查看 - 浏览合同详情；创建 - 上传/新建合同；编辑 - 修改合同内容；删除 - 移除合同记录</li>
            <li><strong>证照管理</strong>：查看 - 浏览证照列表与详情；编辑 - 更新证照信息与文件</li>
            <li><strong>审批管理</strong>：审批 - 通过/拒绝审批申请；查看 - 浏览审批记录</li>
            <li>修改权限后点击「保存」按钮生效，系统会自动记录审计日志</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
