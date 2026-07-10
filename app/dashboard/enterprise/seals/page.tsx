'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
  ModalClose,
} from '@/components/ui/modal';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import {
  Search,
  Stamp,
  Plus,
  Loader2,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SealItem {
  id: string;
  tenantId: string;
  name: string;
  status: 'ACTIVE' | 'DISABLED';
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SealRequest {
  id: string;
  tenantId: string;
  sealId: string;
  sealName: string;
  applicantName: string;
  purpose: string;
  contractRef: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  submittedAt: string;
  processedAt: string | null;
  processorName: string | null;
}

// ===================== 提交用印申请弹窗 =====================
function SealRequestModal({
  open,
  onOpenChange,
  seals,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seals: SealItem[];
  onSuccess: () => void;
}) {
  const [sealId, setSealId] = useState('');
  const [purpose, setPurpose] = useState('');
  const [contractRef, setContractRef] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { tenant } = useAuth();
  const tenantId = tenant?.tenantId || 'default';

  useEffect(() => {
    if (open) {
      setSealId('');
      setPurpose('');
      setContractRef('');
      setError('');
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!sealId) { setError('请选择印章'); return; }
    if (!purpose.trim()) { setError('请填写用印用途'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/enterprise/seal-requests?tenantId=${encodeURIComponent(tenantId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sealId, purpose: purpose.trim(), contractRef: contractRef.trim() || undefined }),
      });
      const data = await res.json();
      if (data.code === 0) {
        toast.success('用印申请已提交');
        onOpenChange(false);
        onSuccess();
      } else {
        setError(data.message || '提交失败');
      }
    } catch {
      setError('网络错误');
    }
    setLoading(false);
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>申请用印</ModalTitle>
          <ModalDescription>填写用印申请信息，提交后需管理员审批</ModalDescription>
        </ModalHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="seal-select">选择印章 *</Label>
            <Select value={sealId} onValueChange={setSealId}>
              <SelectTrigger id="seal-select">
                <SelectValue placeholder="请选择印章" />
              </SelectTrigger>
              <SelectContent>
                {seals.filter(s => s.status === 'ACTIVE').map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
                {seals.filter(s => s.status === 'ACTIVE').length === 0 && (
                  <SelectItem value="_none" disabled>暂无可用印章</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="seal-purpose">用印用途 *</Label>
            <Textarea
              id="seal-purpose"
              placeholder="请详细描述用印目的..."
              value={purpose}
              onChange={e => setPurpose(e.target.value)}
              rows={3}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="seal-contract">关联合同（选填）</Label>
            <Input
              id="seal-contract"
              placeholder="输入合同编号或名称"
              value={contractRef}
              onChange={e => setContractRef(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <ModalFooter>
          <ModalClose asChild>
            <Button variant="outline">取消</Button>
          </ModalClose>
          <Button onClick={handleSubmit} loading={loading}>
            提交申请
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

// ===================== 主页面 =====================
export default function SealsPage() {
  const { tenant } = useAuth();
  const tenantId = tenant?.tenantId || 'default';
  const [seals, setSeals] = useState<SealItem[]>([]);
  const [requests, setRequests] = useState<SealRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [requestOpen, setRequestOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'seals' | 'requests'>('seals');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [sealsRes, reqsRes] = await Promise.all([
        fetch(`/api/enterprise/seals?tenantId=${encodeURIComponent(tenantId)}`),
        fetch(`/api/enterprise/seal-requests?tenantId=${encodeURIComponent(tenantId)}`),
      ]);
      const sealsData = await sealsRes.json();
      const reqsData = await reqsRes.json();
      setSeals(sealsData.seals || []);
      setRequests(reqsData.requests || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [tenantId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredSeals = seals.filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredRequests = requests.filter(r =>
    (statusFilter === 'ALL' || r.status === statusFilter) &&
    (!search || r.purpose.toLowerCase().includes(search.toLowerCase()) || r.sealName.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">印章管理</h1>
          <p className="text-sm text-muted-foreground mt-1">管理企业电子印章与用印申请</p>
        </div>
        <Button onClick={() => setRequestOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />申请用印
        </Button>
      </div>

      {/* Tab 切换 */}
      <div className="flex gap-1 border-b">
        <button
          className={cn(
            'px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-[1px]',
            activeTab === 'seals'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
          onClick={() => setActiveTab('seals')}
        >
          印章列表
        </button>
        <button
          className={cn(
            'px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-[1px]',
            activeTab === 'requests'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
          onClick={() => setActiveTab('requests')}
        >
          用印记录
          {requests.filter(r => r.status === 'PENDING').length > 0 && (
            <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs rounded-full bg-destructive text-destructive-foreground">
              {requests.filter(r => r.status === 'PENDING').length}
            </span>
          )}
        </button>
      </div>

      {/* 搜索 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={activeTab === 'seals' ? '搜索印章名称...' : '搜索用印记录...'}
          className="pl-10"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : activeTab === 'seals' ? (
        /* 印章列表 */
        filteredSeals.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Stamp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">
                {search ? '未找到匹配印章' : '暂无印章'}
              </p>
              <p className="text-sm text-muted-foreground">
                {search ? '尝试其他搜索关键词' : '请联系管理员添加企业印章'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {filteredSeals.map((seal) => (
              <Card key={seal.id} className={cn(
                'transition-colors',
                seal.status === 'DISABLED' && 'opacity-60'
              )}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'p-2.5 rounded-lg',
                        seal.status === 'ACTIVE' ? 'bg-red-50 text-red-600' : 'bg-muted text-muted-foreground'
                      )}>
                        <Stamp className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold">{seal.name}</p>
                        <Badge
                          variant={seal.status === 'ACTIVE' ? 'success' : 'outline'}
                          className="mt-1 text-xs"
                        >
                          {seal.status === 'ACTIVE' ? '正常' : '已停用'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>
                      上次使用：
                      {seal.lastUsedAt
                        ? new Date(seal.lastUsedAt).toLocaleString('zh-CN')
                        : '从未使用'}
                    </p>
                    <p>创建于 {new Date(seal.createdAt).toLocaleDateString('zh-CN')}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : (
        /* 用印记录 */
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="全部状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">全部状态</SelectItem>
                  <SelectItem value="PENDING">待审批</SelectItem>
                  <SelectItem value="APPROVED">已通过</SelectItem>
                  <SelectItem value="REJECTED">已拒绝</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filteredRequests.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">暂无用印记录</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredRequests.map((req) => (
                  <div key={req.id} className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                    <div className={cn(
                      'p-1.5 rounded-full shrink-0',
                      req.status === 'APPROVED' ? 'bg-green-100' :
                      req.status === 'REJECTED' ? 'bg-red-100' : 'bg-yellow-100'
                    )}>
                      {req.status === 'APPROVED' ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : req.status === 'REJECTED' ? (
                        <Stamp className="h-4 w-4 text-red-500" />
                      ) : (
                        <Clock className="h-4 w-4 text-yellow-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">{req.sealName}</p>
                        <Badge
                          variant={req.status === 'APPROVED' ? 'success' : req.status === 'REJECTED' ? 'destructive' : 'warning'}
                          className="shrink-0 text-xs"
                        >
                          {req.status === 'APPROVED' ? '已通过' : req.status === 'REJECTED' ? '已拒绝' : '待审批'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{req.purpose}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>申请人：{req.applicantName}</span>
                        {req.contractRef && <span>合同：{req.contractRef}</span>}
                        <span>{new Date(req.submittedAt).toLocaleString('zh-CN')}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 申请用印弹窗 */}
      <SealRequestModal
        open={requestOpen}
        onOpenChange={setRequestOpen}
        seals={seals}
        onSuccess={fetchData}
      />
    </div>
  );
}
