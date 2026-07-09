'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, Users, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { ROLE_LABELS, type RoleLevel } from '@/lib/permissions';

// 角色颜色映射
const ROLE_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'> = {
  OWNER: 'default',
  ADMIN: 'secondary',
  FINANCE: 'success',
  STAFF: 'warning',
  READONLY: 'outline',
};

interface Member {
  id: string;
  userId: string;
  email: string;
  name: string;
  role: string;
  joinedAt: string;
}

export default function MembersPage() {
  const { tenant } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('STAFF');
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');

  // 当前用户对当前主体的角色
  const currentRole = tenant?.role || '';
  const canManage = currentRole === 'OWNER' || currentRole === 'ADMIN';

  // 加载成员列表
  const loadMembers = async () => {
    if (!tenant?.tenantId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/members?tenantId=${tenant.tenantId}`);
      const data = await res.json();
      if (data.code === 0) {
        setMembers(data.data.list);
      }
    } catch (error) {
      console.error('加载成员列表失败', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, [tenant?.tenantId]);

  // 添加成员
  const handleAddMember = async () => {
    setAddError('');
    setAddSuccess('');

    if (!newEmail.trim()) {
      setAddError('请输入邮箱');
      return;
    }

    try {
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: tenant?.tenantId,
          email: newEmail.trim(),
          role: newRole,
        }),
      });
      const data = await res.json();

      if (data.code === 0) {
        setAddSuccess(data.message);
        setNewEmail('');
        setShowAddDialog(false);
        loadMembers();
      } else {
        setAddError(data.message || '添加失败');
      }
    } catch {
      setAddError('网络错误，请重试');
    }
  };

  // 更新角色
  const handleUpdateRole = async (memberId: string, role: string) => {
    try {
      const res = await fetch(`/api/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();

      if (data.code === 0) {
        loadMembers();
      } else {
        alert(data.message || '更新失败');
      }
    } catch {
      alert('网络错误，请重试');
    }
  };

  // 移除成员
  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!confirm(`确定移除成员 "${memberName}" 吗？`)) return;

    try {
      const res = await fetch(`/api/members/${memberId}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (data.code === 0) {
        loadMembers();
      } else {
        alert(data.message || '移除失败');
      }
    } catch {
      alert('网络错误，请重试');
    }
  };

  const roleOptions: RoleLevel[] = ['READONLY', 'STAFF', 'FINANCE', 'ADMIN'];

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">成员管理</h1>
          <p className="text-muted-foreground mt-1">管理当前主体的成员及角色权限</p>
        </div>
        {canManage && (
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                添加成员
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>添加成员</DialogTitle>
                <DialogDescription>
                  通过邮箱添加用户到当前主体，并分配角色权限
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>用户邮箱</Label>
                  <Input
                    placeholder="请输入用户邮箱"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>角色权限</Label>
                  <Select value={newRole} onValueChange={setNewRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roleOptions.map((r) => (
                        <SelectItem key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {addError && (
                  <p className="text-sm text-destructive">{addError}</p>
                )}
                {addSuccess && (
                  <p className="text-sm text-green-600">{addSuccess}</p>
                )}
                <div className="flex gap-3 pt-2">
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                    取消
                  </Button>
                  <Button onClick={handleAddMember}>确认添加</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* 成员列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            成员列表
            <span className="text-sm font-normal text-muted-foreground">
              （共 {members.length} 人）
            </span>
          </CardTitle>
          <CardDescription>
            当前主体下的所有成员及其角色权限
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              加载中...
            </div>
          ) : members.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <ShieldAlert className="h-12 w-12 mb-4 opacity-50" />
              <p>暂无成员</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>姓名</TableHead>
                  <TableHead>邮箱</TableHead>
                  <TableHead>角色</TableHead>
                  <TableHead>加入时间</TableHead>
                  {(currentRole === 'OWNER' || currentRole === 'ADMIN') && (
                    <TableHead className="text-right">操作</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.name}</TableCell>
                    <TableCell className="text-muted-foreground">{member.email}</TableCell>
                    <TableCell>
                      {currentRole === 'OWNER' && member.role !== 'OWNER' ? (
                        <Select
                          value={member.role}
                          onValueChange={(v) => handleUpdateRole(member.id, v)}
                        >
                          <SelectTrigger className="w-28 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {roleOptions.map((r) => (
                              <SelectItem key={r} value={r}>
                                {ROLE_LABELS[r]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant={ROLE_COLORS[member.role] || 'outline'}>
                          {ROLE_LABELS[member.role as RoleLevel] || member.role}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(member.joinedAt).toLocaleDateString('zh-CN')}
                    </TableCell>
                    {(currentRole === 'OWNER' || currentRole === 'ADMIN') && (
                      <TableCell className="text-right">
                        {member.role !== 'OWNER' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleRemoveMember(member.id, member.name)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
