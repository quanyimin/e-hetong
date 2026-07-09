'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Modal, ModalContent, ModalHeader, ModalTitle } from '@/components/ui/modal';
import { Search, Plus, FileText, ArrowUpDown, Eye, Trash2, AlertTriangle, Sparkles, CheckCircle2, Loader2 } from 'lucide-react';
import { formatDate, formatAmount } from '@/lib/utils';

interface ContractItem {
  id: string; name: string; type: string; partyA: string; partyB: string;
  amount: number | null; endDate: string; status: string;
  parseStatus: string; fileType: string; keywords: string[]; archived: boolean;
}

const TYPE_LABELS: Record<string, string> = { sale: '买卖合同', lease: '租赁合同', labor: '劳动合同', service: '服务合同', other: '其他' };
const STATUS_CONFIG: Record<string, { label: string; variant: 'success' | 'warning' | 'destructive' | 'default' }> = {
  active: { label: '进行中', variant: 'success' },
  expiring: { label: '即将到期', variant: 'warning' },
  expired: { label: '已过期', variant: 'destructive' },
};

export default function ContractsPage() {
  const [contracts, setContracts] = React.useState<ContractItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');
  const [sortBy, setSortBy] = React.useState<'endDate' | 'amount'>('endDate');
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('asc');
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<string | null>(null);

  // 从数据库加载合同
  const loadContracts = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/contracts?userId=user_demo_001&pageSize=100');
      const data = await res.json();
      setContracts(data.data?.list || []);
    } catch (e) {
      console.error('加载合同失败', e);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { loadContracts(); }, [loadContracts]);

  const filtered = contracts
    .filter((c) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!c.name.toLowerCase().includes(q) && !c.partyA.toLowerCase().includes(q) && !c.partyB.toLowerCase().includes(q)) return false;
      }
      if (typeFilter && c.type !== typeFilter) return false;
      if (statusFilter && c.status !== statusFilter) return false;
      return true;
    })
    .sort((a, b) => {
      const cmp = sortBy === 'endDate' ? (a.endDate || '').localeCompare(b.endDate || '') : (a.amount || 0) - (b.amount || 0);
      return sortOrder === 'asc' ? cmp : -cmp;
    });

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortOrder('asc'); }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await fetch(`/api/contracts?id=${deleteTarget}&userId=user_demo_001`, { method: 'DELETE' });
      setContracts((prev) => prev.filter((c) => c.id !== deleteTarget));
    } catch (e) { console.error('删除失败', e); }
    setShowDeleteModal(false);
    setDeleteTarget(null);
  };

  const SortButton = ({ field, label }: { field: typeof sortBy; label: string }) => (
    <button className="flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort(field)}>
      {label}<ArrowUpDown className={`h-3 w-3 ${sortBy === field ? 'text-primary' : 'text-muted-foreground'}`} />
    </button>
  );

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div><h1 className="text-3xl font-bold tracking-tight">合同库</h1><p className="text-muted-foreground mt-1">共 {contracts.length} 份合同</p></div>
        <Link href="/dashboard/upload"><Button><Plus className="h-4 w-4 mr-2" />上传合同</Button></Link>
      </div>

      <Card><CardContent className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-[2]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="搜索名称、甲方..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" /></div>
          <select className="h-10 rounded-md border px-3 text-sm" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">全部类型</option>{Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select className="h-10 rounded-md border px-3 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">全部状态</option><option value="active">进行中</option><option value="expiring">即将到期</option><option value="expired">已过期</option>
          </select>
        </div>
      </CardContent></Card>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>合同名称</TableHead><TableHead>类型</TableHead><TableHead>甲方</TableHead>
            <TableHead className="text-right"><SortButton field="amount" label="金额" /></TableHead>
            <TableHead><SortButton field="endDate" label="到期日" /></TableHead>
            <TableHead>状态</TableHead><TableHead className="text-right">操作</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>{searchQuery ? '没有匹配的合同' : '还没有合同，去上传一份吧'}</p>
                {!searchQuery && <Link href="/dashboard/upload"><Button variant="outline" size="sm" className="mt-2">上传合同</Button></Link>}
              </TableCell></TableRow>
            ) : (
              filtered.map((c) => {
                const sc = STATUS_CONFIG[c.status] || { label: c.status, variant: 'default' as const };
                return (
                  <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell><Link href={`/dashboard/contracts/${c.id}`} className="font-medium hover:text-primary flex items-center gap-2">
                      {c.name}{c.archived && <CheckCircle2 className="h-3 w-3 text-green-500" />}</Link>
                      <p className="text-xs text-muted-foreground">{c.fileType || '-'} · {c.parseStatus === 'completed' ? '已解析' : c.parseStatus}</p>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{TYPE_LABELS[c.type] || c.type}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.partyA || '-'}</TableCell>
                    <TableCell className="text-right text-sm font-medium">{c.amount ? formatAmount(c.amount) : '-'}</TableCell>
                    <TableCell className={`text-sm ${c.status === 'expiring' ? 'text-amber-600 font-medium' : c.status === 'expired' ? 'text-destructive' : ''}`}>{c.endDate || '-'}</TableCell>
                    <TableCell><Badge variant={sc.variant} className="text-xs">{sc.label}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Link href={`/dashboard/contracts/${c.id}`}><Button variant="ghost" size="icon" className="h-8 w-8"><Eye className="h-4 w-4" /></Button></Link>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { setDeleteTarget(c.id); setShowDeleteModal(true); }}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Modal open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <ModalContent><ModalHeader><ModalTitle>确认删除</ModalTitle></ModalHeader>
          <div className="p-6 space-y-4">
            <div className="flex items-start gap-3"><AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="text-sm"><p className="font-medium">确定要删除此合同吗？</p><p className="text-muted-foreground mt-1">删除后不可恢复。</p></div></div>
            <div className="flex gap-3 justify-end"><Button variant="outline" onClick={() => setShowDeleteModal(false)}>取消</Button><Button variant="destructive" onClick={confirmDelete}>确认删除</Button></div>
          </div>
        </ModalContent>
      </Modal>
    </div>
  );
}
