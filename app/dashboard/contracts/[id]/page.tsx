'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  FileText, ArrowLeft, Download, ExternalLink, RefreshCw, AlertTriangle, CheckCircle2,
  Clock, User, DollarSign, Calendar, Tag, FileType, Brain, Loader2, PenSquare, Copy, Check,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { formatDate, formatAmount, formatDateTime } from '@/lib/utils';

// 模拟合同详情
const MOCK_CONTRACT = {
  id: 'c1',
  name: '2024年度供应链采购合同',
  type: 'sale',
  partyA: '上海科技有限公司',
  partyB: '深圳供应链管理有限公司',
  amount: 580000,
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  fileUrl: '/mock/contract.pdf',
  fileType: 'pdf',
  parseStatus: 'completed',
  tags: ['年度', '采购', '供应链'],
  remark: '年度框架协议，按季度分批交货',
  createdAt: '2024-05-15T10:30:00.000Z',
  updatedAt: '2024-05-15T14:20:00.000Z',
  parsedData: {
    contractName: '2024年度供应链采购合同',
    contractType: '买卖合同',
    summary: '上海科技有限公司与深圳供应链管理有限公司就2024年度原材料采购签订此框架协议，合同总金额580,000元，有效期至2024年12月31日。',
    keyClauses: [
      '第3条：甲方应在每月15日前向乙方提交次月采购计划',
      '第7条：付款方式为货到验收合格后30日内支付',
      '第12条：任何一方提前终止合同需提前30日书面通知',
    ],
    riskAlerts: [
      '违约金条款缺失，建议补充逾期付款违约金比例',
      '争议解决方式未明确，建议指定管辖法院',
    ],
  },
};

const TYPE_LABELS: Record<string, string> = { sale: '买卖合同', lease: '租赁合同', labor: '劳动合同', service: '服务合同', other: '其他' };
const PARSE_LABELS: Record<string, { label: string; variant: 'success' | 'warning' | 'destructive' | 'secondary' }> = {
  completed: { label: '解析完成', variant: 'success' },
  processing: { label: '解析中', variant: 'warning' },
  failed: { label: '解析失败', variant: 'destructive' },
};

export default function ContractDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [signDialogOpen, setSignDialogOpen] = React.useState(false);
  const [signerName, setSignerName] = React.useState('');
  const [signerPhone, setSignerPhone] = React.useState('');
  const [signerIdCard, setSignerIdCard] = React.useState('');
  const [signLoading, setSignLoading] = React.useState(false);
  const [signResult, setSignResult] = React.useState<{ signFlowId: string; signUrl: string } | null>(null);
  const [signError, setSignError] = React.useState('');
  const [copied, setCopied] = React.useState(false);
  const contract = MOCK_CONTRACT;

  React.useEffect(() => {
    setTimeout(() => setLoading(false), 500);
  }, []);

  // 发起签署
  const handleStartSign = async () => {
    if (!signerName.trim() || !signerPhone.trim()) {
      setSignError('请填写签署人姓名和手机号');
      return;
    }
    setSignLoading(true);
    setSignError('');
    setSignResult(null);

    try {
      const res = await fetch('/api/esign/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractId: contract.id,
          signers: [
            {
              name: signerName.trim(),
              phone: signerPhone.trim(),
              idCard: signerIdCard.trim() || undefined,
              signType: 'SINGLE',
            },
          ],
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || '创建签署流程失败');
      }

      setSignResult(data.data);
    } catch (err: any) {
      setSignError(err.message || '发起签署失败，请稍后重试');
    } finally {
      setSignLoading(false);
    }
  };

  // 复制签署链接
  const handleCopyLink = async () => {
    if (signResult?.signUrl) {
      try {
        await navigator.clipboard.writeText(signResult.signUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // fallback
      }
    }
  };

  // 关闭对话框并重置状态
  const handleDialogClose = (open: boolean) => {
    setSignDialogOpen(open);
    if (!open) {
      setTimeout(() => {
        setSignResult(null);
        setSignError('');
        setSignerName('');
        setSignerPhone('');
        setSignerIdCard('');
        setCopied(false);
      }, 300);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const status = contract.endDate
    ? new Date(contract.endDate) < new Date() ? 'expired'
      : new Date(contract.endDate).getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000 ? 'expiring' : 'active'
    : 'active';

  const statusLabel = status === 'active' ? '进行中' : status === 'expiring' ? '即将到期' : '已过期';
  const statusVariant = status === 'active' ? 'success' as const : status === 'expiring' ? 'warning' as const : 'destructive' as const;
  const parseCfg = PARSE_LABELS[contract.parseStatus] || { label: contract.parseStatus, variant: 'secondary' as const };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* 返回 + 操作 */}
      <div className="flex items-center justify-between">
        <Link href="/dashboard/contracts" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />返回合同列表
        </Link>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setSignDialogOpen(true)}>
            <PenSquare className="h-4 w-4 mr-1" />发起签署
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1" />下载原文
          </Button>
          {contract.parseStatus === 'failed' && (
            <Button variant="outline" size="sm" className="text-amber-600">
              <RefreshCw className="h-4 w-4 mr-1" />重新解析
            </Button>
          )}
        </div>
      </div>

      {/* 合同基本信息 */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <CardTitle className="text-2xl">{contract.name}</CardTitle>
                <Badge variant={statusVariant}>{statusLabel}</Badge>
                <Badge variant={parseCfg.variant} className="text-xs">{parseCfg.label}</Badge>
              </div>
              <CardDescription>
                {TYPE_LABELS[contract.type] || contract.type} · {contract.fileType?.toUpperCase()}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: '甲方', value: contract.partyA, icon: User },
              { label: '乙方', value: contract.partyB || '-', icon: User },
              { label: '合同金额', value: contract.amount ? formatAmount(contract.amount) : '-', icon: DollarSign },
              { label: '文件类型', value: contract.fileType?.toUpperCase() || '-', icon: FileType },
              { label: '开始日期', value: contract.startDate ? formatDate(contract.startDate) : '-', icon: Calendar },
              { label: '到期日期', value: contract.endDate ? formatDate(contract.endDate) : '-', icon: Clock },
              { label: '创建时间', value: formatDateTime(contract.createdAt), icon: Calendar },
              { label: '更新时间', value: formatDateTime(contract.updatedAt), icon: Calendar },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-2 p-3 rounded-lg bg-muted/30">
                <item.icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-sm font-medium">{item.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* 标签 */}
          {contract.tags && contract.tags.length > 0 && (
            <div className="mt-4 flex items-center gap-2">
              <Tag className="h-4 w-4 text-muted-foreground" />
              {contract.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
              ))}
            </div>
          )}

          {/* 备注 */}
          {contract.remark && (
            <div className="mt-4 p-3 rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground mb-1">备注</p>
              <p className="text-sm">{contract.remark}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 原文查看 */}
      {contract.fileUrl && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              合同原文
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-2">
                {contract.fileType?.toUpperCase()} 文件 · 点击下方按钮查看原文
              </p>
              <div className="flex justify-center gap-3">
                <Button variant="outline" size="sm">
                  <ExternalLink className="h-4 w-4 mr-1" />在新窗口打开
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-1" />下载文件
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI 解析结果 */}
      {contract.parsedData && (
        <>
          {/* 摘要 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                AI 智能解析
              </CardTitle>
              <CardDescription>由人工智能自动提取的合同关键信息</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {contract.parsedData.summary && (
                <div className="p-4 rounded-lg bg-muted/30">
                  <p className="text-sm text-muted-foreground mb-1">摘要</p>
                  <p className="text-sm">{contract.parsedData.summary}</p>
                </div>
              )}

              {/* 关键条款 */}
              {contract.parsedData.keyClauses && contract.parsedData.keyClauses.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">关键条款</p>
                  <div className="space-y-2">
                    {contract.parsedData.keyClauses.map((clause, i) => (
                      <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30">
                        <CheckCircle2 className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                        <p className="text-sm">{clause}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 风险提示 */}
              {contract.parsedData.riskAlerts && contract.parsedData.riskAlerts.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-amber-600 mb-2 flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" />风险提示
                  </p>
                  <div className="space-y-2">
                    {contract.parsedData.riskAlerts.map((alert, i) => (
                      <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30">
                        <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                        <p className="text-sm">{alert}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* 电子签章对话框 */}
      <Dialog open={signDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenSquare className="h-5 w-5 text-primary" />
              发起电子签署
            </DialogTitle>
            <DialogDescription>
              填写签署人信息，发起线上电子签章流程
            </DialogDescription>
          </DialogHeader>

          {!signResult ? (
            <div className="space-y-4 py-2">
              <Input
                label="签署人姓名"
                placeholder="请输入姓名"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                required
              />
              <Input
                label="手机号码"
                placeholder="请输入手机号"
                value={signerPhone}
                onChange={(e) => setSignerPhone(e.target.value)}
                required
              />
              <Input
                label="身份证号（选填）"
                placeholder="请输入身份证号"
                value={signerIdCard}
                onChange={(e) => setSignerIdCard(e.target.value)}
              />

              {signError && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" />
                  {signError}
                </p>
              )}

              <DialogFooter className="pt-2">
                <Button variant="outline" onClick={() => handleDialogClose(false)}>
                  取消
                </Button>
                <Button onClick={handleStartSign} loading={signLoading}>
                  {signLoading ? '正在发起...' : '确认发起签署'}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/30 p-4">
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-2">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">签署流程已创建</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  签署流程 ID：<code className="text-xs bg-muted px-1 rounded">{signResult.signFlowId}</code>
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">签署链接</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-muted px-3 py-2 rounded border truncate">
                    {signResult.signUrl}
                  </code>
                  <Button variant="outline" size="sm" onClick={handleCopyLink}>
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="rounded-lg bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">
                  请将签署链接发送给签署人，对方可在浏览器中打开链接完成电子签章。
                </p>
              </div>

              <DialogFooter className="pt-2">
                <Button onClick={() => handleDialogClose(false)} className="w-full">
                  完成
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
