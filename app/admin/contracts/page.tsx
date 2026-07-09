'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  Eye,
  Filter,
  ChevronLeft,
  ChevronRight,
  FileText,
  ExternalLink,
} from 'lucide-react';
import { formatDate, formatAmount } from '@/lib/utils';

// ===========================================
// 类型与模拟数据
// ===========================================

interface AdminContract {
  id: string;
  name: string;
  type: string;
  user: { name: string | null; email: string | null };
  partyA: string | null;
  amount: number | null;
  endDate: string | null;
  parseStatus: string;
  createdAt: string;
}

const CONTRACT_TYPES: Record<string, string> = {
  sale: '买卖合同', lease: '租赁合同', labor: '劳动合同',
  service: '服务合同', loan: '借款合同', other: '其他',
};

const PARSE_LABELS: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'destructive' | 'secondary' }> = {
  completed: { label: '已解析', variant: 'success' },
  processing: { label: '解析中', variant: 'warning' },
  pending: { label: '待解析', variant: 'secondary' },
  failed: { label: '失败', variant: 'destructive' },
};

const MOCK_CONTRACTS: AdminContract[] = Array.from({ length: 35 }, (_, i) => ({
  id: `contract_${i + 1}`,
  name: [
    '2024年度供应链采购合同', '办公室租赁合同', '员工劳动合同 - 张三',
    '品牌授权协议书', '技术服务合同', '货物运输合同',
    '软件开发外包合同', '广告投放代理合同',
  ][i % 8],
  type: ['sale', 'lease', 'labor', 'service', 'other'][i % 5],
  user: { name: ['张三', '李四', '王五', '赵六'][i % 4], email: ['a@x.com', 'b@x.com', 'c@x.com', 'd@x.com'][i % 4] },
  partyA: ['上海科技', '北京管理', '深圳技术', '广州品牌'][i % 4],
  amount: Math.floor(Math.random() * 100) * 10000 + 5000,
  endDate: ['2024-12-31', '2025-06-30', '2024-08-15', '2025-03-20'][i % 4],
  parseStatus: ['completed', 'completed', 'processing', 'completed', 'failed'][i % 5],
  createdAt: `2024-0${(i % 9) + 1}-${String((i % 28) + 1).padStart(2, '0')}T10:30:00.000Z`,
}));

export default function AdminContractsPage() {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState('all');
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [page, setPage] = React.useState(1);
  const pageSize = 12;

  const filtered = MOCK_CONTRACTS.filter((c) => {
    const matchSearch = !searchQuery || c.name.includes(searchQuery) || c.user.name?.includes(searchQuery);
    const matchType = typeFilter === 'all' || c.type === typeFilter;
    const matchStatus = statusFilter === 'all' || c.parseStatus === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">合同管理</h1>
        <p className="text-muted-foreground text-sm mt-0.5">全平台所有合同，可按用户和状态筛选</p>
      </div>

      {/* 快速统计 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: '全部合同', value: MOCK_CONTRACTS.length, color: 'text-blue-600' },
          { label: '已解析', value: MOCK_CONTRACTS.filter((c) => c.parseStatus === 'completed').length, color: 'text-green-600' },
          { label: '解析中', value: MOCK_CONTRACTS.filter((c) => c.parseStatus === 'processing').length, color: 'text-amber-600' },
          { label: '解析失败', value: MOCK_CONTRACTS.filter((c) => c.parseStatus === 'failed').length, color: 'text-red-600' },
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
                placeholder="搜索合同名或所属用户..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                className="pl-9"
              />
            </div>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            >
              <option value="all">全部类型</option>
              {Object.entries(CONTRACT_TYPES).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            >
              <option value="all">全部状态</option>
              <option value="completed">已解析</option>
              <option value="processing">解析中</option>
              <option value="pending">待解析</option>
              <option value="failed">失败</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* 合同列表 */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>合同名称</TableHead>
                <TableHead>所属用户</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>甲方</TableHead>
                <TableHead className="text-right">金额</TableHead>
                <TableHead>到期日</TableHead>
                <TableHead>解析状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    暂无匹配合同
                  </TableCell>
                </TableRow>
              ) : (
                paged.map((contract) => (
                  <TableRow key={contract.id}>
                    <TableCell className="font-medium text-sm">{contract.name}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <span>{contract.user.name}</span>
                        <span className="text-xs text-muted-foreground ml-1">({contract.user.email})</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {CONTRACT_TYPES[contract.type] || contract.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{contract.partyA}</TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      {contract.amount ? formatAmount(contract.amount) : '-'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {contract.endDate ? formatDate(contract.endDate) : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={PARSE_LABELS[contract.parseStatus]?.variant || 'secondary'} className="text-xs">
                        {PARSE_LABELS[contract.parseStatus]?.label || contract.parseStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/dashboard/contracts/${contract.id}`} target="_blank">
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="查看详情">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Link href={`/admin/users?search=${contract.user.name}`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="查看所属用户">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </Link>
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
          共 {filtered.length} 条
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            <ChevronLeft className="h-4 w-4 mr-1" /> 上一页
          </Button>
          <span className="text-sm text-muted-foreground self-center">{page}/{totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            下一页 <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
