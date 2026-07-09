'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalTrigger } from '@/components/ui/modal';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Search,
  Filter,
  MoreHorizontal,
  Crown,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserX,
  Shield,
  ShieldOff,
} from 'lucide-react';
import { formatDate, formatDateTime } from '@/lib/utils';

// ===========================================
// 类型定义
// ===========================================

interface UserItem {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  memberLevel: 'free' | 'pro';
  memberExpireAt: string | null;
  contractCount: number;
  role: 'user' | 'admin';
  createdAt: string;
  status: 'active' | 'inactive';
}

// ===========================================
// 模拟数据
// ===========================================

const MOCK_USERS: UserItem[] = Array.from({ length: 23 }, (_, i) => ({
  id: `user_${i + 1}`,
  name: ['张三', '李四', '王五', '赵六', '陈七', '刘八', '周九', '吴十'][i % 8],
  email: [`zhangsan`, `lisi`, `wangwu`, `zhaoliu`, `chenqi`, `liuba`, `zhoujiu`, `wushi`][i % 8] + '@example.com',
  phone: i % 3 === 0 ? `138${String(10000000 + i).slice(0, 8)}` : null,
  memberLevel: i % 4 === 1 ? 'pro' : 'free',
  memberExpireAt: i % 4 === 1 ? '2025-06-20T00:00:00.000Z' : null,
  contractCount: Math.floor(Math.random() * 30),
  role: i === 0 ? 'admin' : 'user',
  createdAt: `2024-0${(i % 9) + 1}-${String((i % 28) + 1).padStart(2, '0')}T00:00:00.000Z`,
  status: i % 7 === 0 ? 'inactive' : 'active',
}));

const MEMBER_LABELS: Record<string, string> = { free: '免费版', pro: '年度会员' };
const MEMBER_VARIANTS: Record<string, 'default' | 'secondary' | 'outline'> = { free: 'secondary', pro: 'default' };

// ===========================================
// 页面组件
// ===========================================

export default function AdminUsersPage() {
  const [users] = React.useState(MOCK_USERS);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [levelFilter, setLevelFilter] = React.useState<string>('all');
  const [page, setPage] = React.useState(1);
  const pageSize = 10;

  // 编辑会员弹窗
  const [editUser, setEditUser] = React.useState<UserItem | null>(null);
  const [editDays, setEditDays] = React.useState('365');
  const [showEditModal, setShowEditModal] = React.useState(false);

  const filtered = users.filter((u) => {
    const matchSearch =
      !searchQuery ||
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchLevel = levelFilter === 'all' || u.memberLevel === levelFilter;
    return matchSearch && matchLevel;
  });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleEditMember = (user: UserItem) => {
    setEditUser(user);
    setEditDays(user.memberExpireAt ? '365' : '365');
    setShowEditModal(true);
  };

  const handleSaveMember = () => {
    // TODO: 实际调用 API 更新会员
    console.log(`更新会员: ${editUser?.name}, 天数: ${editDays}`);
    setShowEditModal(false);
  };

  const handleToggleRole = (userId: string, currentRole: string) => {
    // TODO: 实际调用 API 切换角色
    console.log(`切换角色: ${userId}, ${currentRole} → ${currentRole === 'admin' ? 'user' : 'admin'}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">用户管理</h1>
        <p className="text-muted-foreground text-sm mt-0.5">查看和管理所有注册用户</p>
      </div>

      {/* 快速统计 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: '总用户', value: users.length, color: 'text-blue-600' },
          { label: '年度会员', value: users.filter((u) => u.memberLevel === 'pro').length, color: 'text-amber-600' },
          { label: '管理员', value: users.filter((u) => u.role === 'admin').length, color: 'text-purple-600' },
          { label: '活跃用户', value: users.filter((u) => u.status === 'active').length, color: 'text-green-600' },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 搜索与筛选 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索用户名或邮箱..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              {[
                { value: 'all', label: '全部' },
                { value: 'pro', label: '年度会员' },
                { value: 'free', label: '免费版' },
              ].map((opt) => (
                <Button
                  key={opt.value}
                  variant={levelFilter === opt.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => { setLevelFilter(opt.value); setPage(1); }}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 用户列表 */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>用户</TableHead>
                <TableHead>会员等级</TableHead>
                <TableHead>合同数</TableHead>
                <TableHead>角色</TableHead>
                <TableHead>注册时间</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    暂无匹配用户
                  </TableCell>
                </TableRow>
              ) : (
                paged.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                          {user.name?.[0] || '?'}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{user.name || '未设置'}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <Badge variant={MEMBER_VARIANTS[user.memberLevel]} className="text-xs w-fit">
                          {MEMBER_LABELS[user.memberLevel]}
                        </Badge>
                        {user.memberExpireAt && (
                          <span className="text-xs text-muted-foreground">
                            到期 {formatDate(user.memberExpireAt)}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{user.contractCount}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'admin' ? 'default' : 'outline'} className="text-xs">
                        {user.role === 'admin' ? '管理员' : '用户'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(user.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${user.status === 'active' ? 'bg-green-500' : 'bg-red-400'}`} />
                        <span className="text-xs text-muted-foreground">
                          {user.status === 'active' ? '正常' : '停用'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => handleEditMember(user)}
                        >
                          <Crown className="h-3.5 w-3.5 mr-1" />
                          会员
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleToggleRole(user.id, user.role)}
                          title={user.role === 'admin' ? '取消管理员' : '设为管理员'}
                        >
                          {user.role === 'admin' ? (
                            <ShieldOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Shield className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 分页 */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          共 {filtered.length} 条，第 {page}/{totalPages} 页
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            <ChevronLeft className="h-4 w-4 mr-1" /> 上一页
          </Button>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            下一页 <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* 编辑会员弹窗 */}
      <Modal open={showEditModal} onOpenChange={setShowEditModal}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>调整会员 - {editUser?.name}</ModalTitle>
          </ModalHeader>
          <div className="p-6 space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">当前等级</span>
                <span className="font-medium">{MEMBER_LABELS[editUser?.memberLevel || 'free']}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">到期时间</span>
                <span className="font-medium">
                  {editUser?.memberExpireAt ? formatDate(editUser.memberExpireAt) : '无（免费版）'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">合同数量</span>
                <span className="font-medium">{editUser?.contractCount}</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">操作</label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={`${editUser?.memberLevel === 'pro' ? 'renew' : 'upgrade'}`}
                onChange={() => {}}
              >
                <option value="upgrade">升级为年度会员</option>
                <option value="renew">续费年度会员</option>
                <option value="downgrade">降级为免费版</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">会员时长（天）</label>
              <Input
                type="number"
                value={editDays}
                onChange={(e) => setEditDays(e.target.value)}
                min={1}
                max={3650}
              />
              <p className="text-xs text-muted-foreground">默认 365 天，最长 3650 天</p>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <Button variant="outline" onClick={() => setShowEditModal(false)}>
                取消
              </Button>
              <Button onClick={handleSaveMember}>
                确认调整
              </Button>
            </div>
          </div>
        </ModalContent>
      </Modal>
    </div>
  );
}
