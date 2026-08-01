'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertTriangle, CheckCircle2, Clock, PenSquare, Copy, ExternalLink, Download, RefreshCw,
  ShieldCheck, Loader2, FileText, GitBranch, ChevronRight, X,
  FileSignature, Shield, History, DollarSign, Calendar, AlertCircle, ClipboardList,
  FilePlus, Archive, Share2, Edit3, Check,
} from 'lucide-react';
import Link from 'next/link';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { ContractAnalysis } from '@/components/contract-analysis';
import ContractNegotiation from '@/components/contract-negotiation';
import { AiAssistantSidebar } from '@/components/ai-assistant-sidebar';
import { EvidenceSystem } from '@/components/evidence-system';
import { ContractReviewResult } from '@/components/contract-review-result';
import { InitiateSign } from '@/components/esign/initiate-sign';
import {
  ContractDetailHeader,
  ContractDetailStats,
  ContractDetailParties,
  ContractDetailInfo,
  ContractDetailAttachments,
  ContractDetailParsedData,
  ContractDetailLogs,
  ContractDetailFilePreview,
} from '@/components/contract-detail';
import { formatAmount, formatDate, formatDateTime } from '@/lib/utils';
import { getActionLabel } from '@/lib/contract-action-labels';

interface ParsedData {
  summary: string;
  keyClauses: string[];
  riskAlerts: string[];
}

interface ContractDetail {
  id: string;
  name: string;
  type: string;
  partyA: string;
  partyB: string;
  amount: number | null;
  startDate: string | null;
  endDate: string | null;
  fileUrl: string;
  fileType: string;
  parseStatus: string;
  approvalStatus: string;
  tags: string[];
  remark: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  parsedData: ParsedData | null;
  attachments: string | null;
}

// 操作历史日志条目（与 /api/contracts/[id]/logs 返回结构一致）
interface HistoryLogItem {
  id: string;
  action: string;
  detail?: string;
  createdAt: string;
}

export default function ContractDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [contract, setContract] = React.useState<ContractDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  const [signDialogOpen, setSignDialogOpen] = React.useState(false);
  const [signerName, setSignerName] = React.useState('');
  const [signerPhone, setSignerPhone] = React.useState('');
  const [signerIdCard, setSignerIdCard] = React.useState('');
  const [signLoading, setSignLoading] = React.useState(false);
  const [signResult, setSignResult] = React.useState<{ signFlowId: string; signUrl: string } | null>(null);
  const [signError, setSignError] = React.useState('');
  const [copied, setCopied] = React.useState(false);

  const [approvalFlows, setApprovalFlows] = React.useState<{ id: string; name: string; nodes: { order: number; name: string }[] }[]>([]);
  const [showApprovalDialog, setShowApprovalDialog] = React.useState(false);
  const [selectedFlowId, setSelectedFlowId] = React.useState('');
  const [submittingApproval, setSubmittingApproval] = React.useState(false);
  const [approvalError, setApprovalError] = React.useState('');

  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [editForm, setEditForm] = React.useState({
    name: '', partyA: '', partyB: '', amount: '', startDate: '', endDate: '', tags: '', remark: '',
  });
  const [editSaving, setEditSaving] = React.useState(false);
  const [editError, setEditError] = React.useState('');

  const [archiving, setArchiving] = React.useState(false);

  const [shareDialogOpen, setShareDialogOpen] = React.useState(false);
  const [shareUrl, setShareUrl] = React.useState('');
  const [shareLoading, setShareLoading] = React.useState(false);
  const [shareError, setShareError] = React.useState('');
  const [shareCopied, setShareCopied] = React.useState(false);

  // 新增：高级发起签署弹窗（内嵌 InitiateSign 组件）
  const [showSignDialog, setShowSignDialog] = React.useState(false);

  // 新增：操作历史时间线数据
  const [historyLogs, setHistoryLogs] = React.useState<HistoryLogItem[]>([]);
  const [historyLoading, setHistoryLoading] = React.useState(true);

  // 新增：签署任务状态数据
  const [signTask, setSignTask] = React.useState<any>(null);
  const [signTaskLoading, setSignTaskLoading] = React.useState(true);

  // 新增：审批进度数据
  const [approvalProgress, setApprovalProgress] = React.useState<any>(null);
  const [approvalLoading, setApprovalLoading] = React.useState(true);

  const getTenantId = React.useCallback(() => {
    try {
      const match = document.cookie.match(/(^| )ehetong_tenant=([^;]+)/);
      if (match) return JSON.parse(decodeURIComponent(match[2])).tenantId;
    } catch {}
    return null;
  }, []);

  React.useEffect(() => {
    if (!params?.id) return;
    setLoading(true);
    fetch(`/api/contracts/${params.id}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.code === 0 && json.data) {
          setContract(json.data);
        } else {
          setError(json.message || '获取合同详情失败');
        }
      })
      .catch((e) => setError(e.message || '网络错误'))
      .finally(() => setLoading(false));
  }, [params?.id]);

  // 新增：拉取操作历史日志，用于底部时间线展示
  React.useEffect(() => {
    if (!params?.id) return;
    setHistoryLoading(true);
    fetch(`/api/contracts/${params.id}/logs`)
      .then((r) => r.json())
      .then((json) => {
        if (json.code === 0 && Array.isArray(json.data)) {
          setHistoryLogs(json.data);
        }
      })
      .catch(() => {
        // 静默处理，时间线为非关键展示
      })
      .finally(() => setHistoryLoading(false));
  }, [params?.id]);

  // 新增：获取签署任务状态
  React.useEffect(() => {
    if (!params?.id) return;
    const startTime = Date.now();
    setSignTaskLoading(true);
    console.log(`[ContractSignProgress] ════════ 获取签署任务状态开始 ════════`);
    console.log(`[ContractSignProgress] contractId=${params.id}, 开始时间=${new Date().toISOString()}`);

    fetch(`/api/esign/tasks?contractId=${params.id}`)
      .then((r) => {
        console.log(`[ContractSignProgress] HTTP响应: status=${r.status}, ok=${r.ok}`);
        if (!r.ok) {
          throw new Error(`HTTP ${r.status}: ${r.statusText}`);
        }
        return r.json();
      })
      .then((json) => {
        const duration = Date.now() - startTime;
        console.log(`[ContractSignProgress] 响应解析完成, code=${json.code}, 耗时=${duration}ms`);

        if (json.code === 0) {
          const taskList = json.data || [];
          console.log(`[ContractSignProgress] 查询到 ${taskList.length} 条签署任务`);
          if (taskList.length > 0) {
            const taskData = taskList[0];
            console.log(`[ContractSignProgress] 选中第一条任务:`);
            console.log(`  - signId: ${taskData.signId}`);
            console.log(`  - status: ${taskData.status}`);
            console.log(`  - contractName: ${taskData.contractName}`);
            console.log(`  - flowType: ${taskData.flowType}`);
            console.log(`  - signedCount: ${taskData.signedCount}/${taskData.totalCount}`);
            console.log(`  - parties count: ${taskData.parties?.length || 0}`);

            if (taskData.parties && taskData.parties.length > 0) {
              taskData.parties.forEach((party: any, idx: number) => {
                console.log(`  - 签署方[${idx + 1}]: name=${party.name}, role=${party.role}, status=${party.status}, order=${party.signOrder}`);
              });
            }

            setSignTask(taskData);
            console.log(`[ContractSignProgress] 签署任务数据已设置到state`);
          } else {
            console.log(`[ContractSignProgress] 该合同暂无关联签署任务`);
            setSignTask(null);
          }
        } else {
          console.warn(`[ContractSignProgress] API返回错误: code=${json.code}, error=${json.error || json.message}`);
          setSignTask(null);
        }
      })
      .catch((error) => {
        const duration = Date.now() - startTime;
        console.error(`[ContractSignProgress] 获取签署任务失败, 耗时=${duration}ms:`, error);
        console.error(`[ContractSignProgress] 错误类型: ${error.name}, 错误信息: ${error.message}`);
        // 静默处理，签署任务为非关键展示
      })
      .finally(() => {
        const duration = Date.now() - startTime;
        console.log(`[ContractSignProgress] ════════ 获取签署任务状态结束 ════════ 总耗时=${duration}ms`);
        setSignTaskLoading(false);
      });
  }, [params?.id]);

  // 新增：获取审批进度
  React.useEffect(() => {
    const startTime = Date.now();
    console.log(`[ContractApproval] ════════ 获取审批进度开始 ════════`);
    console.log(`[ContractApproval] contractId=${params?.id}, 开始时间=${new Date().toISOString()}`);
    
    if (!params?.id) {
      console.warn(`[ContractApproval] 获取审批进度失败: contractId为空`);
      return;
    }
    
    setApprovalLoading(true);
    fetch(`/api/enterprise/approval-flows/progress?contractId=${params.id}`)
      .then((r) => {
        console.log(`[ContractApproval] HTTP响应: status=${r.status}, ok=${r.ok}`);
        return r.json();
      })
      .then((json) => {
        const duration = Date.now() - startTime;
        console.log(`[ContractApproval] 响应解析完成, code=${json.code}, 耗时=${duration}ms`);
        
        if (json.code === 0 && json.data) {
          console.log(`[ContractApproval] 审批进度数据:`);
          console.log(`  - contract.approvalStatus=${json.data.contract?.approvalStatus}`);
          console.log(`  - flow.name=${json.data.flow?.name}`);
          console.log(`  - flow.nodes数量=${json.data.flow?.nodes?.length || 0}`);
          console.log(`  - approvals数量=${json.data.approvals?.length || 0}`);
          
          setApprovalProgress(json.data);
        } else {
          console.warn(`[ContractApproval] 审批进度API返回失败: message=${json.message}`);
        }
      })
      .catch((error) => {
        const duration = Date.now() - startTime;
        console.error(`[ContractApproval] 获取审批进度失败, 耗时=${duration}ms:`, error);
      })
      .finally(() => {
        const duration = Date.now() - startTime;
        console.log(`[ContractApproval] ════════ 获取审批进度结束 ════════ 总耗时=${duration}ms`);
        setApprovalLoading(false);
      });
  }, [params?.id]);

  const getLifecycleStatus = React.useMemo(() => {
    if (!contract) return { label: '草稿', className: 'bg-slate-100 text-slate-700 border-slate-200' };
    if (contract.archived) return { label: '已归档', className: 'bg-slate-200 text-slate-700 border-slate-300' };
    if (contract.approvalStatus === 'SIGNED') return { label: '已签署', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
    if (contract.approvalStatus === 'PENDING') return { label: '签署中', className: 'bg-amber-100 text-amber-700 border-amber-200' };
    if (contract.approvalStatus === 'APPROVED') return { label: '待签', className: 'bg-blue-100 text-blue-700 border-blue-200' };
    return { label: '草稿', className: 'bg-slate-100 text-slate-600 border-slate-200' };
  }, [contract]);

  // 新增：到期日期风险计算（30天内到期显示红色警告）
  const expiryInfo = React.useMemo(() => {
    if (!contract?.endDate) return { days: null, isExpiringSoon: false, isExpired: false };
    const diffMs = new Date(contract.endDate).getTime() - Date.now();
    const days = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
    return {
      days,
      isExpiringSoon: days >= 0 && days <= 30,
      isExpired: days < 0,
    };
  }, [contract]);

  // 新增：跳转 AI 审查页面
  const handleAiReview = () => {
    console.log('[合同详情] 点击AI审查按钮，合同ID:', params?.id);
    if (!params?.id) {
      console.error('[合同详情] AI审查失败: 合同ID为空');
      toast.error('合同ID为空，无法审查');
      return;
    }
    const reviewUrl = `/dashboard/ai-review/${params.id}`;
    console.log('[合同详情] 跳转AI审查页面:', reviewUrl);
    toast.info('正在跳转 AI 审查页面...');
    router.push(reviewUrl);
  };

  // 新增：发起签署
  const handleInitiateSign = () => {
    console.log('[合同详情] 点击发起签署按钮，合同ID:', params?.id, '合同名称:', contract?.name);
    if (!params?.id) {
      console.error('[合同详情] 发起签署失败: 合同ID为空');
      toast.error('合同ID为空，无法发起签署');
      return;
    }
    if (!contract?.name) {
      console.warn('[合同详情] 发起签署警告: 合同名称为空');
    }
    console.log('[合同详情] 打开发起签署弹窗');
    setShowSignDialog(true);
  };

  // 新增：操作历史时间线图标与颜色映射
  const getHistoryIcon = (action: string) => {
    switch (action) {
      case 'create':
        return { Icon: FilePlus, bg: 'bg-emerald-100 text-emerald-600' };
      case 'update':
        return { Icon: Edit3, bg: 'bg-blue-100 text-blue-600' };
      case 'archive':
        return { Icon: Archive, bg: 'bg-amber-100 text-amber-600' };
      case 'unarchive':
        return { Icon: Archive, bg: 'bg-slate-100 text-slate-600' };
      case 'share':
      case 'unshare':
        return { Icon: Share2, bg: 'bg-purple-100 text-purple-600' };
      case 'esign':
        return { Icon: FileSignature, bg: 'bg-indigo-100 text-indigo-600' };
      case 'approval':
        return { Icon: ShieldCheck, bg: 'bg-teal-100 text-teal-600' };
      case 'export':
        return { Icon: Download, bg: 'bg-cyan-100 text-cyan-600' };
      default:
        return { Icon: History, bg: 'bg-slate-100 text-slate-500' };
    }
  };

  const openEditDialog = () => {
    if (!contract) return;
    setEditForm({
      name: contract.name || '',
      partyA: contract.partyA || '',
      partyB: contract.partyB || '',
      amount: contract.amount ? String(contract.amount) : '',
      startDate: contract.startDate ? contract.startDate.slice(0, 10) : '',
      endDate: contract.endDate ? contract.endDate.slice(0, 10) : '',
      tags: contract.tags?.join(', ') || '',
      remark: contract.remark || '',
    });
    setEditError('');
    setEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    if (!editForm.name.trim()) { setEditError('合同名称不能为空'); return; }
    setEditSaving(true);
    setEditError('');
    try {
      const body: any = { name: editForm.name.trim() };
      if (editForm.partyA) body.partyA = editForm.partyA.trim();
      if (editForm.partyB) body.partyB = editForm.partyB.trim();
      if (editForm.amount) body.amount = parseFloat(editForm.amount);
      if (editForm.startDate) body.startDate = new Date(editForm.startDate).toISOString();
      if (editForm.endDate) body.endDate = new Date(editForm.endDate).toISOString();
      if (editForm.tags) body.tags = editForm.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
      if (editForm.remark) body.remark = editForm.remark.trim();

      const res = await fetch(`/api/contracts/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.code !== 0) throw new Error(json.message || '保存失败');

      window.location.reload();
    } catch (e: any) {
      setEditError(e.message || '保存失败');
    }
    setEditSaving(false);
  };

  const handleArchive = async () => {
    if (!contract) return;
    setArchiving(true);
    try {
      await fetch(`/api/contracts/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: !contract.archived }),
      });
      window.location.reload();
    } catch (e) {
      console.error('归档失败', e);
    }
    setArchiving(false);
  };

  const loadApprovalFlows = React.useCallback(async () => {
    const tenantId = getTenantId();
    if (!tenantId) return;
    try {
      const res = await fetch(`/api/enterprise/approval-flows?tenantId=${tenantId}`);
      const d = await res.json();
      if (d.code === 0) setApprovalFlows(d.data);
    } catch {}
  }, [getTenantId]);

  const handleSubmitApproval = async () => {
    const tenantId = getTenantId();
    if (!tenantId || !selectedFlowId || !params?.id) return;
    setSubmittingApproval(true);
    setApprovalError('');
    try {
      const res = await fetch('/api/enterprise/approval-flows/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractId: params.id, flowId: selectedFlowId, tenantId }),
      });
      const d = await res.json();
      if (d.code === 0) {
        setShowApprovalDialog(false);
        setSelectedFlowId('');
        window.location.reload();
      } else {
        setApprovalError(d.message || '提交失败');
      }
    } catch {
      setApprovalError('网络错误');
    }
    setSubmittingApproval(false);
  };

  const handleSignSubmit = async () => {
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
          contractId: contract!.id,
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

  const handleCopyLink = async () => {
    if (signResult?.signUrl) {
      try {
        await navigator.clipboard.writeText(signResult.signUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {}
    }
  };

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

  const handleShare = async () => {
    setShareLoading(true);
    setShareError('');
    try {
      const res = await fetch(`/api/contracts/${params.id}/share`, { method: 'POST' });
      const json = await res.json();
      if (json.code === 0) setShareUrl(json.data.url);
      else setShareError(json.message || '生成失败');
    } catch { setShareError('网络错误'); }
    setShareLoading(false);
    setShareDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center mb-4">
          <AlertTriangle className="h-8 w-8 text-rose-500" />
        </div>
        <p className="text-lg font-semibold text-slate-800">加载失败</p>
        <p className="text-sm text-slate-500 mt-1">{error}</p>
        <button
          onClick={() => window.history.back()}
          className="mt-6 h-10 px-5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors flex items-center gap-2"
        >
          <ExternalLink className="h-4 w-4" />返回
        </button>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4">
          <FileText className="h-8 w-8 text-slate-300" />
        </div>
        <p className="text-lg font-semibold text-slate-800">合同不存在</p>
        <button
          onClick={() => window.history.back()}
          className="mt-6 h-10 px-5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors flex items-center gap-2"
        >
          <ExternalLink className="h-4 w-4" />返回
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 md:pb-8 -mx-4 md:-mx-8">
      <ContractDetailHeader
        contract={{
          id: contract.id,
          name: contract.name,
          type: contract.type,
          partyA: contract.partyA,
          partyB: contract.partyB,
          approvalStatus: contract.approvalStatus,
          parseStatus: contract.parseStatus,
          archived: contract.archived,
          endDate: contract.endDate,
        }}
        onEdit={openEditDialog}
        onArchive={handleArchive}
        onShare={handleShare}
        onSubmitApproval={() => { loadApprovalFlows(); setShowApprovalDialog(true); }}
        onSign={() => setSignDialogOpen(true)}
        isArchiving={archiving}
      />

      <div className="px-4 md:px-8 -mt-20 relative z-10 space-y-4 max-w-5xl mx-auto">
        {/* 新增：顶部操作栏 —— 合同名称 + 生命周期状态 Badge + 发起签署 / AI审查 入口 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base md:text-lg font-semibold text-slate-800 truncate">
                  {contract.name}
                </h2>
                <Badge variant="outline" className={getLifecycleStatus.className}>
                  {getLifecycleStatus.label}
                </Badge>
                {expiryInfo.isExpiringSoon && (
                  <Badge variant="outline" className="bg-rose-100 text-rose-700 border-rose-200">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {expiryInfo.days}天后到期
                  </Badge>
                )}
                {expiryInfo.isExpired && (
                  <Badge variant="outline" className="bg-rose-100 text-rose-700 border-rose-200">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    已逾期
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                合同编号：<code className="text-xs bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">{contract.id}</code>
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <Button
                onClick={() => setShowSignDialog(true)}
                className="h-9 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 border-0 text-xs"
              >
                <FileSignature className="h-3.5 w-3.5 mr-1.5" />
                发起签署
              </Button>
              <Button
                onClick={handleAiReview}
                variant="outline"
                className="h-9 rounded-xl text-xs border-slate-200 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
              >
                <Shield className="h-3.5 w-3.5 mr-1.5" />
                AI审查
              </Button>
              <Button
                onClick={() => router.push(`/dashboard/fulfillment?contractId=${contract.id}`)}
                variant="outline"
                className="h-9 rounded-xl text-xs border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600"
              >
                <ClipboardList className="h-3.5 w-3.5 mr-1.5" />
                履约跟踪
              </Button>
            </div>
          </div>
        </div>

        {/* 新增：关键信息卡片 —— 金额 / 签订日期 / 到期日期（30天内红色警告） */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-white" />
              </div>
              <span className="text-xs font-medium text-slate-500">合同金额</span>
            </div>
            <p className="text-xl font-bold text-slate-800 tabular-nums">
              {contract.amount ? formatAmount(contract.amount) : '—'}
            </p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                <Calendar className="h-4 w-4 text-white" />
              </div>
              <span className="text-xs font-medium text-slate-500">签订日期</span>
            </div>
            <p className="text-sm font-semibold text-slate-800">
              {contract.startDate ? formatDate(contract.startDate) : '—'}
            </p>
          </div>
          <div className={`rounded-2xl shadow-sm border p-4 ${
            expiryInfo.isExpiringSoon || expiryInfo.isExpired
              ? 'bg-rose-50 border-rose-200 ring-2 ring-rose-500/10'
              : 'bg-white border-slate-100'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                expiryInfo.isExpiringSoon || expiryInfo.isExpired
                  ? 'bg-gradient-to-br from-rose-500 to-red-500'
                  : 'bg-gradient-to-br from-violet-500 to-purple-500'
              }`}>
                <Clock className="h-4 w-4 text-white" />
              </div>
              <span className="text-xs font-medium text-slate-500">到期日期</span>
              {(expiryInfo.isExpiringSoon || expiryInfo.isExpired) && (
                <AlertTriangle className="h-3.5 w-3.5 text-rose-500 ml-auto" />
              )}
            </div>
            <p className={`text-sm font-semibold ${
              expiryInfo.isExpiringSoon || expiryInfo.isExpired ? 'text-rose-600' : 'text-slate-800'
            }`}>
              {contract.endDate ? formatDate(contract.endDate) : '—'}
            </p>
            {expiryInfo.isExpiringSoon && (
              <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                仅剩 {expiryInfo.days} 天到期，请及时续签
              </p>
            )}
            {expiryInfo.isExpired && (
              <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                已逾期 {Math.abs(expiryInfo.days || 0)} 天
              </p>
            )}
          </div>
        </div>

        <ContractDetailStats contract={{
          amount: contract.amount,
          startDate: contract.startDate,
          endDate: contract.endDate,
          fileType: contract.fileType,
        }} />

        <ContractDetailParties contract={{
          partyA: contract.partyA,
          partyB: contract.partyB,
        }} />

        <ContractDetailInfo contract={{
          createdAt: contract.createdAt,
          updatedAt: contract.updatedAt,
          tags: contract.tags,
          remark: contract.remark,
        }} />

        <EvidenceSystem contractId={contract.id} signStatus={contract.approvalStatus === 'SIGNED' ? 'signed' : 'unsigned'} />

        {/* 签署进度卡片 */}
        {(signTask || signTaskLoading) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileSignature className="h-4 w-4 text-amber-500" />
                  签署进度
                </div>
                {signTask && (
                  <Link href={`/dashboard/esign/${signTask.signId}`} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                    查看详情 <ChevronRight className="w-3 h-3" />
                  </Link>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {signTaskLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                  <span className="ml-2 text-xs text-slate-400">加载签署进度...</span>
                </div>
              ) : signTask ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">签署状态</span>
                    <Badge className={
                      signTask.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                      signTask.status === 'SIGNING' ? 'bg-amber-100 text-amber-700' :
                      signTask.status === 'CANCELLED' ? 'bg-slate-100 text-slate-600' :
                      signTask.status === 'REJECTED' ? 'bg-rose-100 text-rose-700' :
                      'bg-blue-100 text-blue-700'
                    }>
                      {{
                        COMPLETED: '已完成', SIGNING: '签署中', CANCELLED: '已撤回',
                        REJECTED: '已拒签', PENDING: '待签署', DRAFT: '草稿', EXPIRED: '已过期',
                      }[signTask.status] || signTask.status}
                    </Badge>
                  </div>
                  {signTask.signers && signTask.signers.length > 0 && (
                    <div className="space-y-2">
                      {signTask.signers.map((signer: any, index: number) => (
                        <div key={signer.signId || index} className="flex items-center gap-3 p-2 rounded-lg bg-slate-50">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                            signer.status === 'signed' ? 'bg-emerald-100' :
                            signer.status === 'rejected' ? 'bg-rose-100' :
                            'bg-amber-100'
                          }`}>
                            {signer.status === 'signed' ? (
                              <Check className="w-4 h-4 text-emerald-600" />
                            ) : signer.status === 'rejected' ? (
                              <X className="w-4 h-4 text-rose-600" />
                            ) : (
                              <Clock className="w-3 h-3 text-amber-600" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-slate-700 truncate">
                              {signer.name || signer.partyName || '签署方'}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {signer.mobile || signer.email || '-'}
                            </p>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded ${
                            signer.status === 'signed' ? 'bg-emerald-50 text-emerald-600' :
                            signer.status === 'rejected' ? 'bg-rose-50 text-rose-600' :
                            'bg-amber-50 text-amber-600'
                          }`}>
                            {{
                              signed: '已签署', pending: '待签署', rejected: '已拒签',
                            }[signer.status] || signer.status}
                          </span>
                          {signer.signedAt && (
                            <span className="text-[10px] text-slate-400">
                              {formatDateTime(signer.signedAt)}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </CardContent>
          </Card>
        )}

        {/* 审批进度卡片 */}
        {(approvalProgress || approvalLoading) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-teal-500" />
                  审批进度
                </div>
                {approvalProgress?.flow && (
                  <span className="text-xs text-slate-400">{approvalProgress.flow.name}</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {approvalLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                  <span className="ml-2 text-xs text-slate-400">加载审批进度...</span>
                </div>
              ) : approvalProgress ? (
                <div className="space-y-4">
                  {/* 审批状态概览 */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">审批状态</span>
                    <Badge className={
                      approvalProgress.contract.approvalStatus === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                      approvalProgress.contract.approvalStatus === 'REJECTED' ? 'bg-rose-100 text-rose-700' :
                      approvalProgress.contract.approvalStatus === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                      'bg-slate-100 text-slate-600'
                    }>
                      {{
                        APPROVED: '已通过', REJECTED: '已拒绝', PENDING: '审批中',
                        NONE: '未提交', DRAFT: '草稿',
                      }[approvalProgress.contract.approvalStatus] || approvalProgress.contract.approvalStatus}
                    </Badge>
                  </div>

                  {/* 审批进度条 */}
                  {approvalProgress.flow?.nodes && approvalProgress.flow.nodes.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-center gap-1">
                        {approvalProgress.flow.nodes.map((node: any, index: number) => {
                          const record = approvalProgress.approvals?.find((a: any) => a.nodeId === node.id);
                          const isCompleted = record?.status === 'APPROVED';
                          const isCurrent = !isCompleted && 
                            (index === 0 || approvalProgress.approvals?.find((a: any) => a.nodeId === approvalProgress.flow.nodes[index - 1]?.id)?.status === 'APPROVED');
                          const isPending = !isCompleted && !isCurrent;
                          
                          return (
                            <div key={node.id} className="flex items-center gap-1">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium shrink-0 ${
                                isCompleted ? 'bg-emerald-500 text-white' :
                                isCurrent ? 'bg-amber-500 text-white' :
                                isPending ? 'bg-slate-200 text-slate-400' :
                                'bg-slate-200 text-slate-400'
                              }`}>
                                {isCompleted ? <Check className="w-4 h-4" /> : index + 1}
                              </div>
                              {index < approvalProgress.flow.nodes.length - 1 && (
                                <div className={`w-8 h-0.5 ${
                                  isCompleted && approvalProgress.approvals?.find((a: any) => a.nodeId === approvalProgress.flow.nodes[index + 1]?.id)?.status === 'APPROVED'
                                    ? 'bg-emerald-500'
                                    : isCompleted && !isPending
                                    ? 'bg-amber-500'
                                    : 'bg-slate-200'
                                }`} />
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* 审批节点详情 */}
                      <div className="space-y-2">
                        {approvalProgress.flow.nodes.map((node: any, index: number) => {
                          const record = approvalProgress.approvals?.find((a: any) => a.nodeId === node.id);
                          const isCompleted = record?.status === 'APPROVED';
                          const isCurrent = !isCompleted && 
                            (index === 0 || approvalProgress.approvals?.find((a: any) => a.nodeId === approvalProgress.flow.nodes[index - 1]?.id)?.status === 'APPROVED');
                          
                          return (
                            <div key={node.id} className={`flex items-center gap-3 p-2 rounded-lg ${
                              isCurrent ? 'bg-amber-50' : 'bg-slate-50/50'
                            }`}>
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-medium shrink-0 ${
                                isCompleted ? 'bg-emerald-100 text-emerald-600' :
                                isCurrent ? 'bg-amber-100 text-amber-600' :
                                'bg-slate-100 text-slate-400'
                              }`}>
                                {isCompleted ? <Check className="w-3 h-3" /> : index + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-xs font-medium ${
                                  isCurrent ? 'text-amber-800' : 'text-slate-700'
                                }`}>
                                  {node.name}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[10px] text-slate-400">
                                    {record?.approverName || '待分配'}
                                  </span>
                                  {record?.processedAt && (
                                    <span className="text-[10px] text-slate-400">
                                      · {formatDateTime(record.processedAt)}
                                    </span>
                                  )}
                                </div>
                                {record?.comment && (
                                  <p className="text-[10px] text-slate-500 mt-1 flex items-start gap-1">
                                    <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
                                    {record.comment}
                                  </p>
                                )}
                              </div>
                              <span className={`text-[10px] px-2 py-0.5 rounded shrink-0 ${
                                isCompleted ? 'bg-emerald-50 text-emerald-600' :
                                isCurrent ? 'bg-amber-50 text-amber-600' :
                                record?.status === 'REJECTED' ? 'bg-rose-50 text-rose-600' :
                                'bg-slate-50 text-slate-400'
                              }`}>
                                {{
                                  APPROVED: '已通过', REJECTED: '已拒绝', PENDING: '待审批',
                                }[record?.status] || '待开始'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </CardContent>
          </Card>
        )}

        <ContractReviewResult contractId={contract.id} />

        {contract.fileUrl && (
          <ContractDetailFilePreview fileUrl={contract.fileUrl} fileType={contract.fileType} />
        )}

        <ContractDetailAttachments
          contractId={contract.id}
          attachments={contract.attachments}
          isUploading={false}
        />

        {contract.parsedData && (
          <ContractDetailParsedData parsedData={contract.parsedData} />
        )}

        <div id="ai-analysis-section">
          <ContractAnalysis contractId={contract.id} />
        </div>

        <div id="ai-negotiation-section">
          <ContractNegotiation contractId={contract.id} contractName={contract.name} />
        </div>

        {/* 版本管理入口 */}
        <Link
          href={`/dashboard/contracts/${contract.id}/versions`}
          className="block bg-white rounded-2xl border border-slate-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                <GitBranch className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-800">版本管理</h3>
                <p className="text-xs text-slate-500 mt-0.5">版本快照、文本比对、AI语义分析、版本回滚</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-blue-500 transition-colors" />
          </div>
        </Link>

        {/* 新增：操作历史时间线 —— 创建/编辑/签署/归档等动作的可视化时间线 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <History className="h-4 w-4 text-blue-500" />
              操作历史
              <span className="text-xs font-normal text-slate-400">
                （{historyLogs.length} 条记录）
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                <span className="ml-2 text-xs text-slate-400">加载操作历史...</span>
              </div>
            ) : historyLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center mb-2">
                  <History className="h-5 w-5 text-slate-300" />
                </div>
                <p className="text-xs text-slate-400">暂无操作历史记录</p>
              </div>
            ) : (
              <div className="space-y-0">
                {historyLogs.map((log, i) => {
                  const { Icon, bg } = getHistoryIcon(log.action);
                  const isLast = i === historyLogs.length - 1;
                  return (
                    <div key={log.id} className="flex gap-3 pb-4 relative">
                      {!isLast && (
                        <div className="absolute left-[18px] top-9 bottom-0 w-px bg-slate-200" />
                      )}
                      <div className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${bg} ring-4 ring-white`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0 pt-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-slate-700">
                            {getActionLabel(log.action as any)}
                          </p>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-mono">
                            {log.action}
                          </span>
                        </div>
                        {log.detail && (
                          <p className="text-xs text-slate-500 mt-0.5 break-words">{log.detail}</p>
                        )}
                        <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDateTime(log.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <ContractDetailLogs contractId={contract.id} />
      </div>

      <Dialog open={signDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                <PenSquare className="h-4 w-4 text-white" />
              </div>
              发起电子签署
            </DialogTitle>
            <DialogDescription>填写签署人信息，发起线上电子签章流程</DialogDescription>
          </DialogHeader>

          {!signResult ? (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600">签署人姓名</label>
                <Input
                  placeholder="请输入姓名"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  className="h-10 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600">手机号码</label>
                <Input
                  placeholder="请输入手机号"
                  value={signerPhone}
                  onChange={(e) => setSignerPhone(e.target.value)}
                  className="h-10 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600">身份证号（选填）</label>
                <Input
                  placeholder="请输入身份证号"
                  value={signerIdCard}
                  onChange={(e) => setSignerIdCard(e.target.value)}
                  className="h-10 rounded-xl"
                />
              </div>

              {signError && (
                <p className="text-sm text-rose-600 flex items-center gap-1.5 bg-rose-50 px-3 py-2 rounded-lg">
                  <AlertTriangle className="h-4 w-4" />
                  {signError}
                </p>
              )}

              <DialogFooter className="pt-2">
                <Button variant="outline" onClick={() => handleDialogClose(false)} className="h-10 rounded-xl">
                  取消
                </Button>
                <Button onClick={handleSignSubmit} loading={signLoading} className="h-10 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 border-0">
                  {signLoading ? '正在发起...' : '确认发起签署'}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 p-4">
                <div className="flex items-center gap-2 text-emerald-600 mb-2">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-semibold text-sm">签署流程已创建</span>
                </div>
                <p className="text-xs text-slate-600">
                  签署流程 ID：<code className="text-xs bg-white px-2 py-0.5 rounded border border-emerald-200">{signResult.signFlowId}</code>
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-600">签署链接</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-slate-50 px-3 py-2.5 rounded-xl border border-slate-200 truncate">
                    {signResult.signUrl}
                  </code>
                  <button
                    onClick={handleCopyLink}
                    className="h-9 w-9 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white flex items-center justify-center hover:shadow-md transition-all shrink-0"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100">
                <p className="text-xs text-slate-500 leading-relaxed">
                  请将签署链接发送给签署人，对方可在浏览器中打开链接完成电子签章。
                </p>
              </div>

              <DialogFooter className="pt-2">
                <Button onClick={() => handleDialogClose(false)} className="w-full h-10 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 border-0">
                  完成
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                <ShieldCheck className="h-4 w-4 text-white" />
              </div>
              提交审批
            </DialogTitle>
            <DialogDescription>选择审批流程后提交合同进行审批</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {approvalFlows.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                  <FileText className="h-6 w-6 text-slate-400" />
                </div>
                <p className="text-sm text-slate-500">暂无可用审批流</p>
                <p className="text-xs text-slate-400 mt-1">请先在「审批流管理」中创建</p>
              </div>
            ) : (
              <div className="space-y-2">
                {approvalFlows.map((flow) => (
                  <label
                    key={flow.id}
                    className={`block p-4 border rounded-xl cursor-pointer transition-all ${
                      selectedFlowId === flow.id
                        ? 'border-blue-400 bg-gradient-to-r from-blue-50 to-indigo-50 ring-2 ring-blue-500/10'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="flowId"
                      value={flow.id}
                      checked={selectedFlowId === flow.id}
                      onChange={() => setSelectedFlowId(flow.id)}
                      className="sr-only"
                    />
                    <div className="font-semibold text-sm text-slate-800">{flow.name}</div>
                    <div className="flex gap-1 mt-1.5 text-xs text-slate-500 flex-wrap">
                      {flow.nodes.map((n, i) => (
                        <span key={i} className="flex items-center gap-0.5">
                          <span className="px-1.5 py-0.5 bg-slate-100 rounded">{n.name}</span>
                          {i < flow.nodes.length - 1 && <span className="text-slate-300 mx-0.5">→</span>}
                        </span>
                      ))}
                    </div>
                  </label>
                ))}
              </div>
            )}
            {approvalError && (
              <p className="text-sm text-rose-600 flex items-center gap-1.5 bg-rose-50 px-3 py-2 rounded-lg">
                <AlertTriangle className="h-4 w-4" />
                {approvalError}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApprovalDialog(false)} className="h-10 rounded-xl">
              取消
            </Button>
            <Button
              onClick={handleSubmitApproval}
              disabled={!selectedFlowId || submittingApproval}
              className="h-10 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 border-0"
            >
              {submittingApproval ? '提交中...' : '提交审批'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenSquare className="h-5 w-5 text-blue-500" />
              编辑合同信息
            </DialogTitle>
            <DialogDescription>修改合同的基本信息，保存后将刷新页面</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">合同名称 *</label>
              <Input value={editForm.name} onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))} className="h-10 rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">甲方</label>
                <Input value={editForm.partyA} onChange={(e) => setEditForm(f => ({ ...f, partyA: e.target.value }))} className="h-10 rounded-xl" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">乙方</label>
                <Input value={editForm.partyB} onChange={(e) => setEditForm(f => ({ ...f, partyB: e.target.value }))} className="h-10 rounded-xl" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">合同金额（元）</label>
                <Input type="number" value={editForm.amount} onChange={(e) => setEditForm(f => ({ ...f, amount: e.target.value }))} className="h-10 rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">开始日期</label>
                  <Input type="date" value={editForm.startDate} onChange={(e) => setEditForm(f => ({ ...f, startDate: e.target.value }))} className="h-10 rounded-xl" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">到期日期</label>
                  <Input type="date" value={editForm.endDate} onChange={(e) => setEditForm(f => ({ ...f, endDate: e.target.value }))} className="h-10 rounded-xl" />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">标签（逗号分隔）</label>
              <Input value={editForm.tags} onChange={(e) => setEditForm(f => ({ ...f, tags: e.target.value }))} placeholder="租房, 年度, 重要" className="h-10 rounded-xl" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">备注</label>
              <textarea
                value={editForm.remark}
                onChange={(e) => setEditForm(f => ({ ...f, remark: e.target.value }))}
                rows={3}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            {editError && (
              <p className="text-sm text-rose-600 flex items-center gap-1.5 bg-rose-50 px-3 py-2 rounded-lg">
                <AlertTriangle className="h-4 w-4" />{editError}
              </p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="h-10 rounded-xl">取消</Button>
            <Button onClick={handleEditSave} disabled={editSaving} className="h-10 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 border-0">
              {editSaving ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5 text-blue-500" />
              分享合同
            </DialogTitle>
            <DialogDescription>其他人可通过此链接查看合同信息（无需登录）</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {shareError ? (
              <p className="text-sm text-rose-600 flex items-center gap-1.5 bg-rose-50 px-3 py-2 rounded-lg">
                <AlertTriangle className="h-4 w-4" />{shareError}
              </p>
            ) : shareUrl ? (
              <>
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3">
                  <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />分享链接已生成
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-slate-50 px-3 py-2.5 rounded-xl border border-slate-200 truncate">
                    {shareUrl}
                  </code>
                  <button
                    onClick={async () => {
                      await navigator.clipboard.writeText(shareUrl);
                      setShareCopied(true);
                      setTimeout(() => setShareCopied(false), 2000);
                    }}
                    className="h-9 px-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-xs font-medium hover:shadow-md transition-all shrink-0"
                  >
                    {shareCopied ? '已复制' : '复制'}
                  </button>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                  <p className="text-xs text-slate-500">
                    任何人都可以通过此链接查看合同名称、金额、主体、AI 解析结果等信息。
                    你可以随时取消分享以失效链接。
                  </p>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                <span className="ml-2 text-sm text-muted-foreground">正在生成分享链接...</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={async () => {
              if (shareUrl) {
                await fetch(`/api/contracts/${params.id}/share`, { method: 'DELETE' });
              }
              setShareDialogOpen(false);
              setShareUrl('');
            }} className="h-10 rounded-xl">
              {shareUrl ? '取消分享' : '关闭'}
            </Button>
            {shareUrl && (
              <Button onClick={() => setShareDialogOpen(false)} className="h-10 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 border-0">
                完成
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 新增：高级发起签署弹窗 —— 内嵌 InitiateSign 组件，支持多方/顺序/并行签署 */}
      <Dialog open={showSignDialog} onOpenChange={setShowSignDialog}>
        <DialogContent className="sm:max-w-2xl rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                <FileSignature className="h-4 w-4 text-white" />
              </div>
              发起电子签署
            </DialogTitle>
            <DialogDescription>
              添加签署方并设置签署顺序，发起线上电子签章流程
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <InitiateSign
              contractId={contract.id}
              contractName={contract.name}
              onCancel={() => setShowSignDialog(false)}
              onSuccess={(_signId) => {
                setShowSignDialog(false);
                toast.success('签署任务已发起');
                setTimeout(() => window.location.reload(), 800);
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      <AiAssistantSidebar contractId={contract.id} contractName={contract.name} />
    </div>
  );
}