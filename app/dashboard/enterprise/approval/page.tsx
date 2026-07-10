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
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import {
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Stamp,
  DollarSign,
  Loader2,
  Ban,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
type ApprovalType = 'CONTRACT' | 'SEAL' | 'PAYMENT' | 'OTHER';

interface ApprovalItem {
  id: string;
  tenantId: string;
  contractId: string | null;
  title: string;
  type: ApprovalType;
  status: ApprovalStatus;
  submittedBy: string;
  approvedBy: string | null;
  comment: string | null;
  submittedAt: string;
  processedAt: string | null;
  createdAt: string;
  applicantName: string;
  approverName: string | null;
}

const TYPE_LABELS: Record<ApprovalType, string> = {
  CONTRACT: '合同审批',
  SEAL: '用印审批',
  PAYMENT: '费用审批',
  OTHER: '其他',
};

const TYPE_ICONS: Record<ApprovalType, React.ReactNode> = {
  CONTRACT: <FileText className="h-4 w-4" />,
  SEAL: <Stamp className="h-4 w-4" />,
  PAYMENT: <DollarSign className="h-4 w-4" />,
  OTHER: <FileText className="h-4 w-4" />,
};

const STATUS_CONFIG: Record<ApprovalStatus, { label: string; variant: 'warning' | 'success' | 'destructive'; icon: React.ReactNode }> = {
  PENDING: { label: '待审批', variant: 'warning', icon: <Clock className="h-3.5 w-3.5" /> },
  APPROVED: { label: '已通过', variant: 'success', icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  REJECTED: { label: '已拒绝', variant: 'destructive', icon: <XCircle className="h-3.5 w-3.5" /> },
};

// ===================== 审批处理弹窗 =====================
function ApproveModal({
  open,
  onOpenChange,
  approval,
  action,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  approval: ApprovalItem;
  action: 'APPROVED' | 'REJECTED';
  onSuccess: () => void;
}) {
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const { tenant } = useAuth();
  const tenantId = tenant?.tenantId || 'default';

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/enterprise/approvals?tenantId=${encodeURIComponent(tenantId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: approval.id, action, comment }),
      });
      const data = await res.json();
      if (data.code === 0) {
        toast.success(action === 'APPROVED' ? '审批已通过' : '已拒绝');
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error(data.message || '操作失败');
      }
    } catch {
      toast.error('网络错误');
    }
    setLoading(false);
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>{action === 'APPROVED' ? '审批通过' : '拒绝申请'}</ModalTitle>
          <ModalDescription>
            {action === 'APPROVED' ? `确认通过「${approval.title}」？` : `确认拒绝「${approval.title}」？`}
          </ModalDescription>
        </ModalHeader>
        <div className="py-2">
          <textarea
            className="flex min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            placeholder="审批意见（选填）"
            value={comment}
            onChange={e => setComment(e.target.value)}
          />
        </div>
        <ModalFooter>
          <ModalClose asChild>
            <Button variant="outline">取消</Button>
          </ModalClose>
          <Button
            variant={action === 'APPROVED' ? 'default' : 'destructive'}
            onClick={handleSubmit}
            loading={loading}
          >
            {action === 'APPROVED' ? '确认通过' : '确认拒绝'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

// ===================== 主页面 =====================
export default function ApprovalPage() {
  const { tenant } = useAuth();
  const tenantId = tenant?.tenantId || 'default';
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // 审批弹窗
  const [selectedApproval, setSelectedApproval] = useState<ApprovalItem | null>(null);
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);

  const fetchApprovals = useCallback(async () => {
    setLoading(true);
    try {
      const url = statusFilter !== 'ALL'
        ? `/api/enterprise/approvals?tenantId=${encodeURIComponent(tenantId)}&status=${statusFilter}`
        : `/api/enterprise/approvals?tenantId=${encodeURIComponent(tenantId)}`;
      const res = await fetch(url);
      const data = await res.json();
      setApprovals(data.approvals || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [tenantId, statusFilter]);

  useEffect(() => { fetchApprovals(); }, [fetchApprovals]);

  const filtered = approvals.filter(a =>
    !search || a.title.toLowerCase().includes(search.toLowerCase()) ||
    a.applicantName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">审批管理</h1>
        <p className="text-sm text-muted-foreground mt-1">合同审批、用印申请、费用报销等企业审批流程</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索审批标题或申请人..."
                className="pl-10"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
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

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">
                {search ? '未找到匹配审批记录' : '暂无审批记录'}
              </p>
              <p className="text-sm text-muted-foreground">
                {search ? '尝试其他搜索关键词' : '当有合同审批、用印申请等流程提交后，将显示在这里'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((item) => {
                const statusCfg = STATUS_CONFIG[item.status];
                return (
                  <div
                    key={item.id}
                    className={cn(
                      'flex items-start gap-4 p-4 rounded-lg border transition-colors',
                      item.status === 'PENDING' ? 'hover:bg-muted/30' : 'bg-muted/20'
                    )}
                  >
                    <div className={cn(
                      'p-2 rounded-full shrink-0',
                      item.type === 'CONTRACT' ? 'bg-blue-100 text-blue-600' :
                      item.type === 'SEAL' ? 'bg-purple-100 text-purple-600' :
                      item.type === 'PAYMENT' ? 'bg-green-100 text-green-600' :
                      'bg-gray-100 text-gray-600'
                    )}>
                      {TYPE_ICONS[item.type]}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium text-sm">{item.title}</p>
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                            <span>{TYPE_LABELS[item.type]}</span>
                            <span>申请人：{item.applicantName}</span>
                            <span>提交于 {new Date(item.submittedAt).toLocaleString('zh-CN')}</span>
                          </div>
                        </div>
                        <Badge variant={statusCfg.variant} className="shrink-0 gap-1">
                          {statusCfg.icon}
                          {statusCfg.label}
                        </Badge>
                      </div>

                      {item.comment && (
                        <p className="text-xs text-muted-foreground mt-2 bg-muted/50 rounded px-2 py-1">
                          审批意见：{item.comment}
                        </p>
                      )}

                      {item.approverName && (
                        <p className="text-xs text-muted-foreground mt-1">
                          处理人：{item.approverName}
                          {item.processedAt && ` · ${new Date(item.processedAt).toLocaleString('zh-CN')}`}
                        </p>
                      )}
                    </div>

                    {/* 操作按钮 */}
                    {item.status === 'PENDING' && (
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700"
                          onClick={() => { setSelectedApproval(item); setApproveOpen(true); }}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                          通过
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive border-destructive/30 hover:bg-destructive/10"
                          onClick={() => { setSelectedApproval(item); setRejectOpen(true); }}
                        >
                          <Ban className="h-3.5 w-3.5 mr-1" />
                          拒绝
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {approvals.length > 0 && (
            <p className="text-xs text-muted-foreground text-center mt-4">
              共 {filtered.length} 条记录{filtered.length < approvals.length ? `（已筛选）` : ''}
            </p>
          )}
        </CardContent>
      </Card>

      {/* 审批弹窗 */}
      {selectedApproval && (
        <>
          <ApproveModal
            open={approveOpen}
            onOpenChange={setApproveOpen}
            approval={selectedApproval}
            action="APPROVED"
            onSuccess={fetchApprovals}
          />
          <ApproveModal
            open={rejectOpen}
            onOpenChange={setRejectOpen}
            approval={selectedApproval}
            action="REJECTED"
            onSuccess={fetchApprovals}
          />
        </>
      )}
    </div>
  );
}
