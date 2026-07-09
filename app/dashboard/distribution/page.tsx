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
  Copy,
  Check,
  TrendingUp,
  Share2,
  ChevronRight,
  Wallet,
  Banknote,
  ExternalLink,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { formatDate, formatAmount } from '@/lib/utils';

// ===========================================
// 模拟数据（TODO: 替换真实 API）
// ===========================================

const MOCK_STATS = {
  level: 'distributor',
  contractBonus: 45,
  totalEarned: 680,
  withdrawable: 320,
  customerCount: 12,
  commissionCount: 18,
  pendingCommissions: 3,
  settledTotal: 360,
};

const INVITE_CODE = 'ABC12345';
const INVITE_URL = 'https://e-hetong.com/register?invite=ABC12345';

const CUSTOMERS = Array.from({ length: 12 }, (_, i) => ({
  id: `c_${i + 1}`,
  name: ['张三', '李四', '王五', '赵六', '陈七', '刘八'][i % 6],
  email: ['zhang@test.com', 'li@test.com', 'wang@test.com', 'zhao@test.com', 'chen@test.com', 'liu@test.com'][i % 6],
  memberLevel: i % 3 === 0 ? 'pro' : 'free',
  joinedAt: '2024-05-' + String(10 + i).padStart(2, '0'),
  totalOrders: i % 2 === 0 ? 1 : 0,
  commissionEarned: i % 3 === 0 ? 14.85 : 0,
}));

const COMMISSIONS = Array.from({ length: 8 }, (_, i) => ({
  id: `com_${i + 1}`,
  customerName: ['张三', '李四', '王五', '赵六'][i % 4],
  orderAmount: 99,
  rate: 0.15,
  amount: 14.85,
  status: i < 2 ? 'pending' : 'settled',
  date: '2024-05-' + String(12 + i).padStart(2, '0'),
}));

export default function DistributionPage() {
  const [copied, setCopied] = React.useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = React.useState(false);
  const [withdrawAmount, setWithdrawAmount] = React.useState('');
  const [tab, setTab] = React.useState<'overview' | 'customers' | 'commissions'>('overview');

  const copyInviteLink = () => {
    navigator.clipboard.writeText(INVITE_URL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWithdraw = () => {
    // TODO: 实际调用提现 API
    setShowWithdrawModal(false);
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Gift className="h-7 w-7 text-primary" />
            分销中心
          </h1>
          <p className="text-muted-foreground mt-1">邀请好友赚奖励，推广越多收获越多</p>
        </div>
        <Badge variant="default" className="text-sm px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-500">
          {MOCK_STATS.level === 'agent' ? '代理商' : '分销商'}
        </Badge>
      </div>

      {/* 邀请码区域 - 突出展示 */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <Share2 className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium mb-1">您的专属邀请链接</p>
              <div className="flex items-center gap-2">
                <code className="bg-background/80 px-3 py-1.5 rounded-md text-sm font-mono border">
                  {INVITE_URL}
                </code>
                <Button variant="outline" size="sm" onClick={copyInviteLink} className="shrink-0">
                  {copied ? (
                    <><Check className="h-4 w-4 mr-1 text-green-500" />已复制</>
                  ) : (
                    <><Copy className="h-4 w-4 mr-1" />复制链接</>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                邀请码：<strong>{INVITE_CODE}</strong> · 每邀请1人您获得10份合同奖励
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 核心数据 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: '奖励合同', value: `${MOCK_STATS.contractBonus}份`, icon: Gift, color: 'text-blue-600', bg: 'bg-blue-100' },
          { label: '累计收益', value: formatAmount(MOCK_STATS.totalEarned), icon: DollarSign, color: 'text-green-600', bg: 'bg-green-100' },
          { label: '可提现', value: formatAmount(MOCK_STATS.withdrawable), icon: Wallet, color: 'text-amber-600', bg: 'bg-amber-100' },
          { label: '客户数', value: `${MOCK_STATS.customerCount}人`, icon: Users, color: 'text-purple-600', bg: 'bg-purple-100' },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className={`text-lg font-bold mt-0.5 ${stat.color}`}>{stat.value}</p>
                </div>
                <div className={`h-9 w-9 rounded-full ${stat.bg} flex items-center justify-center`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2">
        {[
          { key: 'overview', label: '推广概览' },
          { key: 'customers', label: `客户管理 (${MOCK_STATS.customerCount})` },
          { key: 'commissions', label: `佣金记录 (${MOCK_STATS.commissionCount})` },
        ].map((t) => (
          <Button
            key={t.key}
            variant={tab === t.key ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setTab(t.key as any)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {/* 推广概览 */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                推广收益趋势
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">本月新增客户</span>
                  <span className="font-medium">{MOCK_STATS.customerCount} 人</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">本月佣金</span>
                  <span className="font-medium">{formatAmount(MOCK_STATS.settledTotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">待结算佣金</span>
                  <span className="font-medium text-amber-600">{formatAmount(MOCK_STATS.pendingCommissions * 14.85)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm font-medium">
                  <span>分成比例</span>
                  <span className="text-primary">{MOCK_STATS.level === 'agent' ? '25%' : '15%'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Banknote className="h-4 w-4 text-primary" />
                佣金提现
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-primary">{formatAmount(MOCK_STATS.withdrawable)}</p>
                <p className="text-xs text-muted-foreground mt-1">可提现余额</p>
              </div>
              <Button
                className="w-full"
                disabled={MOCK_STATS.withdrawable < 100}
                onClick={() => setShowWithdrawModal(true)}
              >
                <Wallet className="h-4 w-4 mr-2" />
                {MOCK_STATS.withdrawable < 100 ? '满 ¥100 可提现' : '申请提现'}
              </Button>
              <p className="text-xs text-center text-muted-foreground">最低提现金额 ¥100 · 7个工作日内到账</p>
            </CardContent>
          </Card>

          {/* 推广指引 */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">推广指引</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { step: '1', title: '分享邀请链接', desc: '将您的专属链接分享给好友' },
                  { step: '2', title: '好友注册', desc: '好友通过链接注册，获得5份合同奖励' },
                  { step: '3', title: '您获得奖励', desc: '每个好友给您带来10份合同+15%佣金' },
                ].map((item) => (
                  <div key={item.step} className="flex items-start gap-3">
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                      {item.step}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 客户管理 */}
      {tab === 'customers' && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>客户</TableHead>
                  <TableHead>会员等级</TableHead>
                  <TableHead>加入时间</TableHead>
                  <TableHead>订单数</TableHead>
                  <TableHead>贡献佣金</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {CUSTOMERS.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                          {c.name[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{c.name}</p>
                          <p className="text-xs text-muted-foreground">{c.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={c.memberLevel === 'pro' ? 'default' : 'secondary'} className="text-xs">
                        {c.memberLevel === 'pro' ? '年度会员' : '免费版'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.joinedAt}</TableCell>
                    <TableCell className="text-sm">{c.totalOrders}</TableCell>
                    <TableCell className="text-sm font-medium">{c.commissionEarned > 0 ? formatAmount(c.commissionEarned) : '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* 佣金记录 */}
      {tab === 'commissions' && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>客户</TableHead>
                  <TableHead>订单金额</TableHead>
                  <TableHead>分成比例</TableHead>
                  <TableHead>佣金金额</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>日期</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {COMMISSIONS.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-sm font-medium">{c.customerName}</TableCell>
                    <TableCell className="text-sm">{formatAmount(c.orderAmount)}</TableCell>
                    <TableCell className="text-sm">{Math.round(c.rate * 100)}%</TableCell>
                    <TableCell className="text-sm font-medium">{formatAmount(c.amount)}</TableCell>
                    <TableCell>
                      <Badge variant={c.status === 'settled' ? 'success' : 'warning'} className="text-xs">
                        {c.status === 'settled' ? '已结算' : '待结算'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.date}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* 提现弹窗 */}
      <Modal open={showWithdrawModal} onOpenChange={setShowWithdrawModal}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>申请提现</ModalTitle>
          </ModalHeader>
          <div className="p-6 space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground">可提现余额</p>
              <p className="text-3xl font-bold text-primary">{formatAmount(MOCK_STATS.withdrawable)}</p>
            </div>

            <div className="space-y-2">
              <Label>提现金额</Label>
              <Input
                type="number"
                placeholder="最低 ¥100"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                max={MOCK_STATS.withdrawable}
              />
            </div>

            <div className="space-y-2">
              <Label>开户银行</Label>
              <Input placeholder="例如：中国银行" />
            </div>

            <div className="space-y-2">
              <Label>银行账号</Label>
              <Input placeholder="请输入银行卡号" />
            </div>

            <div className="space-y-2">
              <Label>开户姓名</Label>
              <Input placeholder="持卡人姓名" />
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <Button variant="outline" onClick={() => setShowWithdrawModal(false)}>
                取消
              </Button>
              <Button onClick={handleWithdraw} disabled={!withdrawAmount || Number(withdrawAmount) < 100}>
                提交申请
              </Button>
            </div>
          </div>
        </ModalContent>
      </Modal>
    </div>
  );
}
