'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Modal, ModalContent, ModalHeader, ModalTitle } from '@/components/ui/modal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Search, Plus, FileText, ArrowUpDown, Eye, Trash2, AlertTriangle, Loader2, ChevronDown, Download, Upload, X, CheckSquare, Square } from 'lucide-react';
import { formatAmount } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';

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

const MOCK_CATEGORIES = [
  { id: 'f1', name: '采购合同', count: 5 },
  { id: 'f2', name: '租赁合同', count: 3 },
  { id: 'f3', name: '劳动合同', count: 8 },
  { id: 'f4', name: '技术服务', count: 2 },
  { id: 'f5', name: '品牌授权', count: 1 },
];

export default function ContractsPage() {
  const { tenant } = useAuth();
  const effectiveTenantId = tenant?.tenantId || 'default';
  const [contracts, setContracts] = React.useState<ContractItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');
  const [activeCategory, setActiveCategory] = React.useState('all');
  const categories = MOCK_CATEGORIES;
  const [sortBy, setSortBy] = React.useState<'endDate' | 'amount'>('endDate');
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('asc');
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<string | null>(null);

  // 高级筛选
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const [filters, setFilters] = React.useState({
    dateFrom: '', dateTo: '',
    amountMin: '', amountMax: '',
    tag: '',
  });

  // 批量选择
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [showBatchDeleteModal, setShowBatchDeleteModal] = React.useState(false);
  const [batchDeleting, setBatchDeleting] = React.useState(false);

  // 导入
  const [importing, setImporting] = React.useState(false);

  // 加载合同数据
  const loadContracts = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/contracts?tenantId=${effectiveTenantId}&pageSize=100`);
      const data = await res.json();
      setContracts(data.data?.list || []);
    } catch (e) {
      console.error('加载合同失败', e);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { loadContracts(); }, [loadContracts]);

  // 过滤 + 排序
  const filtered = contracts
    .filter((c) => {
      // 分类筛选
      if (activeCategory !== 'all' && (c as any).folderId !== activeCategory) return false;
      // 关键词搜索
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!c.name.toLowerCase().includes(q) && !c.partyA.toLowerCase().includes(q) && !c.partyB.toLowerCase().includes(q)) return false;
      }
      // 类型筛选
      if (typeFilter && c.type !== typeFilter) return false;
      // 状态筛选
      if (statusFilter && c.status !== statusFilter) return false;
      // 高级筛选 - 日期范围
      if (filters.dateFrom && c.endDate && c.endDate < filters.dateFrom) return false;
      if (filters.dateTo && c.endDate && c.endDate > filters.dateTo) return false;
      // 高级筛选 - 金额范围
      if (filters.amountMin && (c.amount === null || c.amount < Number(filters.amountMin))) return false;
      if (filters.amountMax && (c.amount === null || c.amount > Number(filters.amountMax))) return false;
      // 高级筛选 - 标签
      if (filters.tag && !c.keywords?.some(k => k.toLowerCase().includes(filters.tag.toLowerCase()))) return false;
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

  const SortButton = ({ field, label }: { field: typeof sortBy; label: string }) => (
    <button className="flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort(field)}>
      {label}<ArrowUpDown className={`h-3 w-3 ${sortBy === field ? 'text-primary' : 'text-muted-foreground'}`} />
    </button>
  );

  // ========== 批量选择逻辑 ==========
  const allDisplayedIds = filtered.map(c => c.id);
  const isAllSelected = allDisplayedIds.length > 0 && allDisplayedIds.every(id => selectedIds.has(id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allDisplayedIds));
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const clearSelection = () => setSelectedIds(new Set());

  // ========== 单条删除 ==========
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await fetch(`/api/contracts?id=${deleteTarget}&tenantId=${effectiveTenantId}`, { method: 'DELETE' });
      setContracts((prev) => prev.filter((c) => c.id !== deleteTarget));
      // 如果删除的是已选中的，清除选中状态
      setSelectedIds((prev) => { const next = new Set(prev); next.delete(deleteTarget); return next; });
    } catch (e) { console.error('删除失败', e); }
    setShowDeleteModal(false);
    setDeleteTarget(null);
  };

  // ========== 批量删除 ==========
  const confirmBatchDelete = async () => {
    setBatchDeleting(true);
    try {
      const res = await fetch('/api/contracts/batch', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: effectiveTenantId, ids: Array.from(selectedIds) }),
      });
      const data = await res.json();
      if (data.success) {
        setContracts((prev) => prev.filter((c) => !selectedIds.has(c.id)));
        setSelectedIds(new Set());
        setShowBatchDeleteModal(false);
      }
    } catch (e) {
      console.error('批量删除失败', e);
    } finally {
      setBatchDeleting(false);
    }
  };

  // ========== 导出 CSV ==========
  const exportToCSV = (items: ContractItem[]) => {
    const headers = '合同名称,合同类型,甲方,乙方,金额,签订日期,到期日,状态\n';
    const rows = items.map(c =>
      `"${c.name}","${TYPE_LABELS[c.type] || c.type}","${c.partyA || ''}","${c.partyB || ''}",${c.amount || 0},"${c.endDate || ''}","${c.endDate || ''}","${STATUS_CONFIG[c.status]?.label || c.status}"`
    ).join('\n');
    const blob = new Blob(['\uFEFF' + headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `合同导出_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  // ========== 导入文件 ==========
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      let parsedData: any[] = [];

      if (file.name.endsWith('.csv')) {
        // 解析 CSV
        const text = await file.text();
        const lines = text.split('\n').filter(l => l.trim());
        if (lines.length < 2) throw new Error('CSV 文件为空或格式不正确');

        // 解析表头（去除 BOM）
        const headers = lines[0].replace(/^\uFEFF/, '').split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        parsedData = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
          const row: Record<string, string> = {};
          headers.forEach((h, i) => { row[h] = values[i] || ''; });
          return row;
        });
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        // 解析 Excel
        const XLSX = await import('xlsx');
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        parsedData = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });
      } else {
        throw new Error('不支持的文件格式，请上传 CSV 或 Excel 文件');
      }

      if (parsedData.length === 0) throw new Error('文件中没有合同数据');

      // 发送到后端导入
      const res = await fetch('/api/contracts/batch-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contracts: parsedData }),
      });
      const result = await res.json();
      if (result.success) {
        alert(`成功导入 ${result.imported} 份合同`);
        loadContracts();
      } else {
        alert('导入失败：' + (result.error || '未知错误'));
      }
    } catch (err: any) {
      alert('导入失败：' + (err.message || '未知错误'));
    } finally {
      setImporting(false);
      // 重置文件输入
      e.target.value = '';
    }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      {/* 标题栏 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">合同库</h1>
          <p className="text-muted-foreground mt-1">共 {contracts.length} 份合同</p>
        </div>
        <div className="flex items-center gap-2">
          {/* 导出按钮 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline"><Download className="h-4 w-4 mr-2" />导出</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => exportToCSV(filtered)}>
                <Download className="h-4 w-4 mr-2" />导出 CSV
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <Download className="h-4 w-4 mr-2" />导出 Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* 导入按钮 */}
          <div className="relative">
            <Button variant="outline" disabled={importing} onClick={() => document.getElementById('import-file-input')?.click()}>
              <Upload className="h-4 w-4 mr-2" />{importing ? '导入中...' : '导入'}
            </Button>
            <input
              id="import-file-input"
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={handleImportFile}
            />
          </div>

          <Link href="/dashboard/upload">
            <Button><Plus className="h-4 w-4 mr-2" />上传合同</Button>
          </Link>
        </div>
      </div>

      {/* 搜索栏 */}
      <Card><CardContent className="p-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-[2]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="搜索名称、甲方、乙方..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
            <select className="h-10 rounded-md border px-3 text-sm" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="">全部类型</option>{Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select className="h-10 rounded-md border px-3 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">全部状态</option><option value="active">进行中</option><option value="expiring">即将到期</option><option value="expired">已过期</option>
            </select>
            <Button variant="ghost" size="sm" className="shrink-0" onClick={() => setShowAdvanced(!showAdvanced)}>
              <ChevronDown className={`h-4 w-4 mr-1 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
              高级筛选
              {(filters.dateFrom || filters.dateTo || filters.amountMin || filters.amountMax || filters.tag) && (
                <span className="ml-1.5 w-2 h-2 rounded-full bg-primary" />
              )}
            </Button>
          </div>

          {/* 高级筛选面板 */}
          {showAdvanced && (
            <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">签订日期从</Label>
                  <Input type="date" value={filters.dateFrom} onChange={(e) => setFilters(f => ({ ...f, dateFrom: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">签订日期至</Label>
                  <Input type="date" value={filters.dateTo} onChange={(e) => setFilters(f => ({ ...f, dateTo: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">金额最小值</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">¥</span>
                    <Input type="number" placeholder="0" value={filters.amountMin} onChange={(e) => setFilters(f => ({ ...f, amountMin: e.target.value }))} className="pl-7" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">金额最大值</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">¥</span>
                    <Input type="number" placeholder="999999" value={filters.amountMax} onChange={(e) => setFilters(f => ({ ...f, amountMax: e.target.value }))} className="pl-7" />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="space-y-1.5 flex-1 max-w-xs">
                  <Label className="text-xs text-muted-foreground">标签搜索</Label>
                  <Input placeholder="输入标签关键词..." value={filters.tag} onChange={(e) => setFilters(f => ({ ...f, tag: e.target.value }))} />
                </div>
                <Button variant="ghost" size="sm" className="mt-5" onClick={() => setFilters({ dateFrom: '', dateTo: '', amountMin: '', amountMax: '', tag: '' })}>
                  <X className="h-3 w-3 mr-1" />清除筛选
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent></Card>

      {/* 分类标签栏 */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setActiveCategory('all')}
          className={`whitespace-nowrap px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            activeCategory === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'
          }`}
        >全部合同</button>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeCategory === cat.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
          >
            {cat.name}
            <span className="ml-1 text-xs opacity-70">({cat.count})</span>
          </button>
        ))}
      </div>

      {/* 批量操作栏 */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-lg px-4 py-3">
          <span className="text-sm font-medium">已选择 <strong>{selectedIds.size}</strong> 项</span>
          <div className="flex items-center gap-2">
            <Button variant="destructive" size="sm" onClick={() => setShowBatchDeleteModal(true)}>
              <Trash2 className="h-4 w-4 mr-1" />批量删除
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportToCSV(filtered.filter(c => selectedIds.has(c.id)))}>
              <Download className="h-4 w-4 mr-1" />批量导出
            </Button>
            <Button variant="ghost" size="sm" onClick={clearSelection}>
              <X className="h-4 w-4 mr-1" />取消选择
            </Button>
          </div>
        </div>
      )}

      {/* 表格 */}
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead className="w-10">
              <button onClick={toggleSelectAll} className="flex items-center justify-center w-full">
                {isAllSelected ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4 text-muted-foreground" />}
              </button>
            </TableHead>
            <TableHead>合同名称</TableHead><TableHead>类型</TableHead><TableHead>甲方</TableHead>
            <TableHead className="text-right"><SortButton field="amount" label="金额" /></TableHead>
            <TableHead><SortButton field="endDate" label="到期日" /></TableHead>
            <TableHead>状态</TableHead><TableHead className="text-right">操作</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>{searchQuery || filters.tag || filters.dateFrom ? '没有匹配的合同' : '还没有合同，去上传一份吧'}</p>
                {!searchQuery && !filters.tag && !filters.dateFrom && <Link href="/dashboard/upload"><Button variant="outline" size="sm" className="mt-2">上传合同</Button></Link>}
              </TableCell></TableRow>
            ) : (
              filtered.map((c) => {
                const sc = STATUS_CONFIG[c.status] || { label: c.status, variant: 'default' as const };
                const isSelected = selectedIds.has(c.id);
                return (
                  <TableRow key={c.id} className={`cursor-pointer hover:bg-muted/50 ${isSelected ? 'bg-primary/5' : ''}`}>
                    <TableCell className="w-10">
                      <button onClick={(e) => { e.stopPropagation(); toggleSelect(c.id); }} className="flex items-center justify-center w-full">
                        {isSelected ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4 text-muted-foreground" />}
                      </button>
                    </TableCell>
                    <TableCell>
                      <Link href={`/dashboard/contracts/${c.id}`} className="font-medium hover:text-primary flex items-center gap-2">
                        {c.name}{c.archived && <CheckSquare className="h-3 w-3 text-green-500" />}
                      </Link>
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

      {/* 单条删除确认弹窗 */}
      <Modal open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <ModalContent><ModalHeader><ModalTitle>确认删除</ModalTitle></ModalHeader>
          <div className="p-6 space-y-4">
            <div className="flex items-start gap-3"><AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="text-sm"><p className="font-medium">确定要删除此合同吗？</p><p className="text-muted-foreground mt-1">删除后不可恢复。</p></div></div>
            <div className="flex gap-3 justify-end"><Button variant="outline" onClick={() => setShowDeleteModal(false)}>取消</Button><Button variant="destructive" onClick={confirmDelete}>确认删除</Button></div>
          </div>
        </ModalContent>
      </Modal>

      {/* 批量删除确认弹窗 */}
      <Modal open={showBatchDeleteModal} onOpenChange={setShowBatchDeleteModal}>
        <ModalContent><ModalHeader><ModalTitle>确认批量删除</ModalTitle></ModalHeader>
          <div className="p-6 space-y-4">
            <div className="flex items-start gap-3"><AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">确定要删除选中的 {selectedIds.size} 份合同吗？</p>
                <p className="text-muted-foreground mt-1">删除后不可恢复。</p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowBatchDeleteModal(false)} disabled={batchDeleting}>取消</Button>
              <Button variant="destructive" onClick={confirmBatchDelete} disabled={batchDeleting}>
                {batchDeleting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                确认删除
              </Button>
            </div>
          </div>
        </ModalContent>
      </Modal>
    </div>
  );
}
