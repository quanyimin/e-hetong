'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Modal, ModalContent, ModalHeader, ModalTitle } from '@/components/ui/modal';
import {
  Gift,
  Users,
  DollarSign,
  TrendingUp,
  Search,
  Shield,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Crown,
  UserPlus,
  UserMinus,
  AlertTriangle,
} from 'lucide-react';
import { formatDate, formatAmount, formatDateTime } from '@/lib/utils';

// ===========================================
// 模拟数据
// ===========================================

const DISTRIBUTORS = Array.from({ length: 8 }, (_, i) => ({
  id: `dist_${i + 1}`,
  name: ['张三', '李四', '王五', '赵六', '陈七', '刘八', '周九', '吴十'][i],
  email: ['zhang@test.com', 'li@test.com', 'wang@test.com', 'zhao@test.com', 'chen@test.com', 'liu@test.com', 'zhou@test.com', 'wu@test.com'][i],
  level: (i < 2 ? 'agent' : 'distributor') as 'agent' | 'distributor',
  customerCount: Math.floor(Math.random() * 30) + 3,
  totalEarned: Math.floor(Math.random() * 5000),
  pendingCommission: Math.floor(Math.random() * 500),
  status: i % 6 === 0 ? 'expired' : 'active',
  since: '2024-0' + String((i % 4) + 1) + '-' + String(10 + i).padStart(2, '0'),
  expireAt: '2025-0' + String((i % 4) + 1) + '-' + String(10 + i).padStart(2, '0'),
}));

const WITHDRAWALS = [
  { id: 'w1', userName: '张三', amount: 200, status: 'pending', bankName: '中国银行', bankAccount: '****1234', date: '2024-05-20' },
  { id: 'w2', userName: '李四', amount: 350, status: 'pending', bankName: '工商银行', bankAccount: '****5678', date: '2024-05-19' },
  { id: 'w3', userName: '王五', amount: 150, status: 'approved', bankName: '建设银行', bankAccount: '****9012', date: '2024-05-18' },
  { id: 'w4', userName: '赵六', amount: 500, status: 'completed', bankName: '农业银行', bankAccount: '****3456', date: '2024-05-15' },
];

export default function AdminDistributionPage() {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [showUpgradeModal, setShowUpgradeModal] = React.useState(false);
  const [selectedUser, setSelectedUser] = React.useState<typeof DISTRIBUTORS[0] | null>(null);
  const [upgradeLevel, setUpgradeLevel] = React.useState<'distributor' | 'agent'>('distributor');
  const pageSize = 10;

  const filtered = DISTRIBUTORS.filter((d) =>
    !searchQuery || d.name.includes(searchQuery) || d.email.includes(searchQuery)
  );

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const stats = {
    total: DISTRIBUTORS.length,
    agents: DISTRIBUTORS.filter((d) => d.level === 'agent').length,
    active: DISTRIBUTORS.filter((d) => d.status === 'active').length,
    totalCommission: DISTRIBUTORS.reduce((s, d) => s + d.totalEarned, 0),
    totalWithdrawalPending: WITHDRAWALS.filter((w) => w.status === 'pending').reduce((s, w) => s + w.amount, 0),
  };

  const handleUpgrade = (user: typeof DISTRIBUTORS[0]) => {
    setSelectedUser(user);
    setUpgradeLevel(user.level === 'agent' ? 'distributor' : user.level);
    setShowUpgradeModal(true);
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Gift className="h-6 w-6 text-primary" />
            分销管理
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">管理分销商/代理商、审核提现申请</p>
        </div>
      </div>

      {/* 预警：待审核提现 */}
      {WITHDRAWALS.filter((w) => w.status === 'pending').length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/10">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
            <div className="text-sm flex-1">
              <span className="font-medium">待审核提现：{WITHDRAWALS.filter((w) => w.status === 'pending').length} 笔</span>
              <span className="text-muted-foreground ml-2">
                总金额 {formatAmount(stats.totalWithdrawalPending)}，请及时处理
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 统计 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: '分销商/代理商', value: stats.total, sub: `代理商 ${stats.agents} 人`, color: 'text-blue-600', icon: Users },
          { label: '活跃中', value: stats.active, sub: `${stats.total - stats.active} 人已过期`, color: 'text-green-600', icon: TrendingUp },
          { label: '累计发放佣金', value: formatAmount(stats.totalCommission), sub: '总支出', color: 'text-purple-600', icon: DollarSign },
          { label: '待审核提现金额', value: formatAmount(stats.totalWithdrawalPending), sub: `${WITHDRAWALS.filter((w) => w.status === 'pending').length} 笔`, color: 'text-amber-600', icon: Gift },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className={`text-xl font-bold mt-0.5 ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{stat.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 分销商管理 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">分销商/代理商列表</CardTitle>
            <CardDescription>管理所有分销渠道人员</CardDescription>
          </div>
          <div className="relative w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="搜索姓名或邮箱..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>姓名</TableHead>
                <TableHead>等级</TableHead>
                <TableHead>客户数</TableHead>
                <TableHead>累计收益</TableHead>
                <TableHead>待结算</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>成为时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>
                    <div>
                      <p className="text-sm font-medium">{d.name}</p>
                      <p className="text-xs text-muted-foreground">{d.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={d.level === 'agent' ? 'default' : 'secondary'} className="text-xs">
                      {d.level === 'agent' ? '代理商' : '分销商'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{d.customerCount}</TableCell>
                  <TableCell className="text-sm font-medium">{formatAmount(d.totalEarned)}</TableCell>
                  <TableCell className="text-sm text-amber-600">{formatAmount(d.pendingCommission)}</TableCell>
                  <TableCell>
                    <Badge variant={d.status === 'active' ? 'success' : 'destructive'} className="text-xs">
                      {d.status === 'active' ? '有效' : '已过期'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{d.since}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => handleUpgrade(d)}>
                        <Crown className="h-3.5 w-3.5 mr-1" />
                        调整
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 提现审核 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            提现审核
          </CardTitle>
          <CardDescription>处理分销商的提现申请</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>申请人</TableHead>
                <TableHead>提现金额</TableHead>
                <TableHead>银行信息</TableHead>
                <TableHead>申请时间</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {WITHDRAWALS.map((w) => (
                <TableRow key={w.id}>
                  <TableCell className="text-sm font-medium">{w.userName}</TableCell>
                  <TableCell className="text-sm font-medium">{formatAmount(w.amount)}</TableCell>
                  <TableCell>
                    <p className="text-sm">{w.bankName}</p>
                    <p className="text-xs text-muted-foreground">{w.bankAccount}</p>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{w.date}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        w.status === 'pending' ? 'warning' :
                        w.status === 'approved' ? 'default' :
                        w.status === 'completed' ? 'success' : 'secondary'
                      }
                      className="text-xs"
                    >
                      {w.status === 'pending' ? '待审核' :
                       w.status === 'approved' ? '已通过' :
                       w.status === 'completed' ? '已完成' : '已拒绝'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {w.status === 'pending' && (
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" className="h-8 text-xs text-green-600">
                          <CheckCircle2 className="h-4 w-4 mr-1" />通过
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 text-xs text-destructive">
                          <XCircle className="h-4 w-4 mr-1" />拒绝
                        </Button>
                      </div>
                    )}
                    {w.status === 'approved' && (
                      <Button variant="ghost" size="sm" className="h-8 text-xs">
                        确认到账
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 调整分销商弹窗 */}
      <Modal open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>调整分销商 - {selectedUser?.name}</ModalTitle>
          </ModalHeader>
          <div className="p-6 space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">当前等级</span>
                <Badge variant={selectedUser?.level === 'agent' ? 'default' : 'secondary'}>
                  {selectedUser?.level === 'agent' ? '代理商' : '分销商'}
                </Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">客户数量</span>
                <span className="font-medium">{selectedUser?.customerCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">累计收益</span>
                <span className="font-medium">{formatAmount(selectedUser?.totalEarned || 0)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>调整等级</Label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={upgradeLevel}
                onChange={(e) => setUpgradeLevel(e.target.value as any)}
              >
                <option value="distributor">分销商（15%分成）</option>
                <option value="agent">代理商（25%分成）</option>
                <option value="none">降级为普通用户</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label>有效期（天）</Label>
              <Input type="number" defaultValue={365} min={1} max={3650} />
              <p className="text-xs text-muted-foreground">默认 365 天，过期后自动降级</p>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <Button variant="outline" onClick={() => setShowUpgradeModal(false)}>取消</Button>
              <Button>确认调整</Button>
            </div>
          </div>
        </ModalContent>
      </Modal>
    </div>
  );
}
