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
  ModalTrigger,
  ModalClose,
} from '@/components/ui/modal';
import { Label } from '@/components/ui/label';
import {
  Building2,
  Plus,
  ChevronRight,
  ChevronDown,
  Edit2,
  Search,
  Trash2,
  Users,
  X,
  Loader2,
  Mail,
  Phone,
  UserCircle,
  BadgeCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Department {
  id: string;
  name: string;
  parentId: string | null;
  managerId: string | null;
  sortOrder: number;
  children?: Department[];
}

interface DeptMember {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  isManager: boolean;
}

interface DeptDetail {
  department: Department;
  members: DeptMember[];
}

// ===================== Department Form Modal =====================
function DeptFormModal({
  open,
  onOpenChange,
  title,
  departments,
  initialData,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  departments: Department[];
  initialData?: Department;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(initialData?.name || '');
  const [parentId, setParentId] = useState(initialData?.parentId || '');
  const [managerId, setManagerId] = useState(initialData?.managerId || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setName(initialData?.name || '');
      setParentId(initialData?.parentId || '');
      setManagerId(initialData?.managerId || '');
      setError('');
    }
  }, [open, initialData]);

  // Filter out self and descendants for parent selection
  const getAvailableParents = (): Department[] => {
    if (!initialData) return departments;
    const excludeIds = new Set<string>();
    const collectDescendants = (dept: Department) => {
      excludeIds.add(dept.id);
      dept.children?.forEach(collectDescendants);
    };
    // Find the node in the tree
    const findNode = (list: Department[]): Department | undefined => {
      for (const d of list) {
        if (d.id === initialData.id) return d;
        if (d.children) {
          const found = findNode(d.children);
          if (found) return found;
        }
      }
      return undefined;
    };
    const node = findNode(departments);
    if (node) collectDescendants(node);
    return departments.filter(d => !excludeIds.has(d.id));
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('部门名称不能为空');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const url = initialData
        ? `/api/enterprise/org/${initialData.id}`
        : '/api/enterprise/org';
      const method = initialData ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          parentId: parentId || null,
          managerId: managerId || null,
        }),
      });
      const data = await res.json();
      if (data.code === 0) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(data.message || '操作失败');
      }
    } catch (e) {
      setError('网络错误');
    }
    setLoading(false);
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>{title}</ModalTitle>
          <ModalDescription>填写部门信息</ModalDescription>
        </ModalHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="dept-name">部门名称 *</Label>
            <Input
              id="dept-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="输入部门名称"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="dept-parent">上级部门</Label>
            <Select value={parentId} onValueChange={setParentId}>
              <SelectTrigger>
                <SelectValue placeholder="无（顶级部门）" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">无（顶级部门）</SelectItem>
                {(initialData ? getAvailableParents() : departments).map(d => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="dept-manager">负责人ID（选填）</Label>
            <Input
              id="dept-manager"
              value={managerId}
              onChange={e => setManagerId(e.target.value)}
              placeholder="输入用户ID"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <ModalFooter>
          <ModalClose asChild>
            <Button variant="outline">取消</Button>
          </ModalClose>
          <Button onClick={handleSubmit} loading={loading}>
            {initialData ? '保存' : '创建'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

// ===================== Confirm Delete Dialog =====================
function ConfirmDeleteModal({
  open,
  onOpenChange,
  departmentName,
  onConfirm,
  loading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departmentName: string;
  onConfirm: () => void;
  loading: boolean;
}) {
  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent>
        <ModalHeader>
          <ModalTitle className="text-destructive">确认删除</ModalTitle>
          <ModalDescription>
            确定要删除部门「{departmentName}」吗？此操作不可撤销。
          </ModalDescription>
        </ModalHeader>
        <ModalFooter>
          <ModalClose asChild>
            <Button variant="outline">取消</Button>
          </ModalClose>
          <Button variant="destructive" onClick={onConfirm} loading={loading}>
            确认删除
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

// ===================== Department Detail Panel =====================
function DeptDetailPanel({
  department,
  onClose,
}: {
  department: Department;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<DeptDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/enterprise/org/${department.id}`)
      .then(res => res.json())
      .then(data => {
        if (data.code === 0) setDetail(data.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [department.id]);

  return (
    <div className="border rounded-lg p-4 bg-muted/30">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          {department.name}
        </h3>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : detail ? (
        <div className="space-y-3">
          <div className="text-sm">
            <span className="text-muted-foreground">ID：</span>
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{department.id}</code>
          </div>

          <div>
            <h4 className="text-sm font-medium flex items-center gap-1.5 mb-2">
              <Users className="h-3.5 w-3.5" />
              部门成员（{detail.members.length}）
            </h4>
            {detail.members.length === 0 ? (
              <p className="text-xs text-muted-foreground">暂无成员</p>
            ) : (
              <div className="space-y-1.5">
                {detail.members.map(member => (
                  <div
                    key={member.id}
                    className={cn(
                      'flex items-center justify-between rounded-md px-3 py-2 text-sm',
                      member.isManager && 'bg-primary/5 border border-primary/10'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <UserCircle className="h-4 w-4 text-muted-foreground" />
                      <span>{member.name}</span>
                      {member.isManager && (
                        <BadgeCheck className="h-3.5 w-3.5 text-primary" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {member.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {member.email}
                        </span>
                      )}
                      {member.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {member.phone}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="text-xs text-muted-foreground">
            {detail.members.filter(m => m.isManager).length > 0
              ? '✓ 已标记部门负责人'
              : '未设置部门负责人'}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">加载失败</p>
      )}
    </div>
  );
}

// ===================== Main Page =====================
export default function EnterpriseOrgPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [flatDepartments, setFlatDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  // Form modals
  const [createOpen, setCreateOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | undefined>(undefined);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteDept, setDeleteDept] = useState<Department | undefined>(undefined);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [selectedDept, setSelectedDept] = useState<Department | undefined>(undefined);

  const fetchDepartments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/enterprise/org');
      const data = await res.json();
      const list = data.departments || [];
      setFlatDepartments(list);
      setDepartments(buildTree(list));
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchDepartments(); }, [fetchDepartments]);

  function buildTree(items: Department[]): Department[] {
    const map = new Map<string, Department>();
    const roots: Department[] = [];
    items.forEach(item => map.set(item.id, { ...item, children: [] }));
    items.forEach(item => {
      if (item.parentId && map.has(item.parentId)) {
        map.get(item.parentId)!.children!.push(map.get(item.id)!);
      } else {
        roots.push(map.get(item.id)!);
      }
    });
    return roots;
  }

  function toggleExpand(id: string) {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpanded(next);
  }

  const handleEdit = (e: React.MouseEvent, dept: Department) => {
    e.stopPropagation();
    setEditingDept(dept);
    setEditOpen(true);
  };

  const handleDelete = (e: React.MouseEvent, dept: Department) => {
    e.stopPropagation();
    setDeleteDept(dept);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteDept) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/enterprise/org/${deleteDept.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.code === 0) {
        setDeleteOpen(false);
        setDeleteDept(undefined);
        if (selectedDept?.id === deleteDept.id) setSelectedDept(undefined);
        fetchDepartments();
      } else {
        alert(data.message || '删除失败');
      }
    } catch (e) {
      alert('网络错误');
    }
    setDeleteLoading(false);
  };

  const handleSelectDept = (dept: Department) => {
    setSelectedDept(prev => (prev?.id === dept.id ? undefined : dept));
  };

  // Filter departments for search
  function filterTree(nodes: Department[], query: string): Department[] {
    if (!query.trim()) return nodes;
    return nodes
      .map(node => {
        const match = node.name.toLowerCase().includes(query.toLowerCase());
        const filteredChildren = node.children ? filterTree(node.children, query) : [];
        if (match || filteredChildren.length > 0) {
          return { ...node, children: filteredChildren };
        }
        return null;
      })
      .filter(Boolean) as Department[];
  }

  function renderTree(nodes: Department[], depth = 0) {
    return nodes.map(node => (
      <div key={node.id}>
        <div
          className={cn(
            'flex items-center gap-2 py-2.5 px-3 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors group',
            selectedDept?.id === node.id && 'bg-muted/80'
          )}
          style={{ paddingLeft: `${depth * 24 + 12}px` }}
        >
          <div
            className="w-5 flex justify-center"
            onClick={(e) => {
              e.stopPropagation();
              if (node.children?.length) toggleExpand(node.id);
            }}
          >
            {node.children?.length ? (
              expanded.has(node.id) ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )
            ) : (
              <span className="w-4" />
            )}
          </div>
          <Building2
            className="h-4 w-4 text-muted-foreground shrink-0"
            onClick={(e) => { e.stopPropagation(); handleSelectDept(node); }}
          />
          <span
            className="text-sm font-medium flex-1"
            onClick={() => handleSelectDept(node)}
          >
            {node.name}
          </span>
          <Badge variant="outline" className="text-xs opacity-0 group-hover:opacity-100 transition-opacity">
            {node.children?.length || 0} 子部门
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => handleEdit(e, node)}
          >
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
            onClick={(e) => handleDelete(e, node)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
        {expanded.has(node.id) && node.children && renderTree(node.children, depth + 1)}
      </div>
    ));
  }

  const filteredTree = filterTree(departments, search);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">组织架构</h1>
          <p className="text-sm text-muted-foreground mt-1">管理集团、公司、部门的多级组织树</p>
        </div>
        <Button onClick={() => { setEditingDept(undefined); setCreateOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />新增部门
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardContent className="p-4">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索部门..."
                className="pl-10"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredTree.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-2">
                  {search ? '未找到匹配部门' : '暂无组织架构'}
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  {search ? '尝试其他搜索关键词' : '新增部门来构建您的企业组织树'}
                </p>
                {!search && (
                  <Button variant="outline" onClick={() => setCreateOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />新增部门
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-0.5">
                {renderTree(filteredTree)}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detail Panel */}
        {selectedDept && (
          <DeptDetailPanel
            department={selectedDept}
            onClose={() => setSelectedDept(undefined)}
          />
        )}
      </div>

      {/* Create Modal */}
      <DeptFormModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="新增部门"
        departments={flatDepartments}
        onSuccess={fetchDepartments}
      />

      {/* Edit Modal */}
      <DeptFormModal
        open={editOpen}
        onOpenChange={setEditOpen}
        title="编辑部门"
        departments={flatDepartments}
        initialData={editingDept}
        onSuccess={fetchDepartments}
      />

      {/* Delete Confirm */}
      <ConfirmDeleteModal
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        departmentName={deleteDept?.name || ''}
        onConfirm={confirmDelete}
        loading={deleteLoading}
      />
    </div>
  );
}
