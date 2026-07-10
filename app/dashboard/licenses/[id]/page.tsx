'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  ArrowLeft, Edit3, Trash2, AlertTriangle, IdCard, GraduationCap, Award, Car, Briefcase, FileType, Calendar, Building2, Hash, FileText, Clock, ImageIcon, Loader2,
} from 'lucide-react';

const TYPE_LABELS: Record<string, string> = {
  ID_CARD: '身份证',
  GRADUATION: '毕业证',
  HONOR: '荣誉证书',
  DRIVER_LICENSE: '驾驶证',
  PROFESSIONAL: '职业证书',
  OTHER: '其他',
};

const TYPE_ICONS: Record<string, React.ElementType> = {
  ID_CARD: IdCard,
  GRADUATION: GraduationCap,
  HONOR: Award,
  DRIVER_LICENSE: Car,
  PROFESSIONAL: Briefcase,
  OTHER: FileType,
};

const NOTIFY_OPTIONS = [
  { value: '7', label: '提前7天' },
  { value: '15', label: '提前15天' },
  { value: '30', label: '提前30天' },
  { value: '60', label: '提前60天' },
  { value: '90', label: '提前90天' },
];

export default function LicenseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [license, setLicense] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // 编辑表单
  const [editForm, setEditForm] = useState<any>({});

  useEffect(() => { fetchLicense(); }, [id]);

  async function fetchLicense() {
    setLoading(true);
    try {
      const res = await fetch(`/api/licenses/${id}`);
      const data = await res.json();
      if (data.license) {
        setLicense(data.license);
        setEditForm({
          name: data.license.name || '',
          licenseNumber: data.license.licenseNumber || '',
          issuingAuthority: data.license.issuingAuthority || '',
          type: data.license.type || 'OTHER',
          issueDate: data.license.issueDate ? data.license.issueDate.split('T')[0] : '',
          expireDate: data.license.expireDate ? data.license.expireDate.split('T')[0] : '',
          notifyDays: String(data.license.notifyDays || 30),
        });
      }
    } catch { toast.error('加载失败'); }
    setLoading(false);
  }

  function getDaysLeft(expireDate: string): number {
    if (!expireDate) return Infinity;
    const diff = new Date(expireDate).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  function formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('zh-CN');
  }

  function getFiles(): string[] {
    try {
      if (!license?.files) return [];
      const parsed = typeof license.files === 'string' ? JSON.parse(license.files) : license.files;
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  }

  async function handleSave() {
    if (!editForm.name) { toast.error('证照名称不能为空'); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/licenses/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editForm,
          notifyDays: parseInt(editForm.notifyDays),
        }),
      });
      if (!res.ok) throw new Error('更新失败');
      toast.success('证照已更新');
      setEditOpen(false);
      fetchLicense();
    } catch { toast.error('更新失败'); }
    setSaving(false);
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/licenses/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('删除失败');
      toast.success('证照已删除');
      router.push('/dashboard/licenses');
    } catch { toast.error('删除失败'); }
    setDeleting(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!license) {
    return (
      <div className="text-center py-20">
        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">证照不存在或已被删除</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/dashboard/licenses')}>返回列表</Button>
      </div>
    );
  }

  const daysLeft = getDaysLeft(license.expireDate);
  const files = getFiles();
  const TypeIcon = TYPE_ICONS[license.type] || FileText;
  const StatusIcon = daysLeft <= 0 ? AlertTriangle : daysLeft <= 30 ? Clock : FileText;

  return (
    <div className="space-y-6">
      {/* 顶部操作栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/licenses')}>
            <ArrowLeft className="h-4 w-4 mr-1" /> 返回
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Edit3 className="h-4 w-4 mr-1" />编辑
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setDeleteConfirmOpen(true)}>
            <Trash2 className="h-4 w-4 mr-1" />删除
          </Button>
        </div>
      </div>

      {/* 状态横幅 */}
      {license.expireDate && daysLeft <= 30 && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-lg ${
          daysLeft <= 0 ? 'bg-red-50 text-red-700 border border-red-200' :
          'bg-amber-50 text-amber-700 border border-amber-200'
        }`}>
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-medium">
              {daysLeft <= 0 ? '此证照已过期' : `此证照将于 ${daysLeft} 天后到期`}
            </p>
            <p className="text-sm opacity-80">
              {daysLeft <= 0 ? '请及时办理续期或更新' : '请提前准备续期材料'}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：证照图片 */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-4">
              {files.length > 0 ? (
                <div className="space-y-3">
                  {files.map((file, i) => (
                    <div key={i} className="relative rounded-lg overflow-hidden border">
                      <img src={file} alt={`证照图片 ${i + 1}`} className="w-full object-contain max-h-80" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <ImageIcon className="h-12 w-12 mb-3" />
                  <p className="text-sm">暂无证照图片</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 右侧：证照信息 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 基本信息 */}
          <Card>
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <TypeIcon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl">{license.name}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {TYPE_LABELS[license.type] || license.type}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoField icon={FileText} label="证照名称" value={license.name} />
                <InfoField icon={Hash} label="证照编号" value={license.licenseNumber || '—'} />
                <InfoField icon={Building2} label="发证机关" value={license.issuingAuthority || '—'} />
                <InfoField icon={Calendar} label="证照类型" value={TYPE_LABELS[license.type] || license.type} />
                <InfoField icon={Calendar} label="签发日期" value={formatDate(license.issueDate)} />
                <InfoField icon={Clock} label="截止日期" value={formatDate(license.expireDate)} />
              </div>
            </CardContent>
          </Card>

          {/* 到期提醒 */}
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base">到期提醒</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className={`flex items-center justify-center w-20 h-20 rounded-full text-2xl font-bold ${
                  daysLeft <= 0 ? 'bg-red-100 text-red-600' :
                  daysLeft <= 30 ? 'bg-amber-100 text-amber-600' :
                  'bg-green-100 text-green-600'
                }`}>
                  {daysLeft <= 0 ? '过期' : daysLeft}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {daysLeft <= 0
                      ? '证照已过期'
                      : `距离到期还有 ${daysLeft} 天`
                    }
                  </p>
                  <p className="text-sm text-muted-foreground">
                    提前提醒天数：{license.notifyDays || 30} 天
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 状态标签 */}
          <div className="flex gap-2">
            {daysLeft <= 0 && <Badge variant="destructive" className="text-sm px-3 py-1">已过期</Badge>}
            {daysLeft > 0 && daysLeft <= 30 && <Badge variant="default" className="bg-amber-500 text-sm px-3 py-1">即将到期</Badge>}
            {daysLeft > 30 && <Badge variant="secondary" className="text-sm px-3 py-1">正常</Badge>}
            {!license.expireDate && <Badge variant="outline" className="text-sm px-3 py-1">长期有效</Badge>}
          </div>
        </div>
      </div>

      {/* 编辑弹窗 */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>编辑证照信息</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>证照名称 <span className="text-red-500">*</span></Label>
              <Input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>证照类型</Label>
              <Select value={editForm.type} onValueChange={v => setEditForm({ ...editForm, type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>证照编号</Label>
              <Input value={editForm.licenseNumber} onChange={e => setEditForm({ ...editForm, licenseNumber: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>发证机关</Label>
              <Input value={editForm.issuingAuthority} onChange={e => setEditForm({ ...editForm, issuingAuthority: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>签发日期</Label>
              <Input type="date" value={editForm.issueDate} onChange={e => setEditForm({ ...editForm, issueDate: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>截止日期 <span className="text-red-500">*</span></Label>
              <Input type="date" value={editForm.expireDate} onChange={e => setEditForm({ ...editForm, expireDate: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>提前提醒</Label>
              <Select value={editForm.notifyDays} onValueChange={v => setEditForm({ ...editForm, notifyDays: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NOTIFY_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>取消</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认弹窗 */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            确定要删除「{license.name}」吗？此操作不可撤销。
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>取消</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoField({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="p-1.5 rounded-md bg-muted mt-0.5">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium truncate">{value}</p>
      </div>
    </div>
  );
}
