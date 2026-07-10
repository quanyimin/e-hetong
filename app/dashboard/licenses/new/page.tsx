'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Camera, Upload, ArrowLeft, Loader2, IdCard, GraduationCap, Award, Car, Briefcase, FileType, ImageIcon, X,
} from 'lucide-react';

const TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  ID_CARD: { label: '身份证', icon: IdCard, color: 'bg-blue-50 text-blue-600 border-blue-200' },
  GRADUATION: { label: '毕业证', icon: GraduationCap, color: 'bg-green-50 text-green-600 border-green-200' },
  HONOR: { label: '荣誉证书', icon: Award, color: 'bg-amber-50 text-amber-600 border-amber-200' },
  DRIVER_LICENSE: { label: '驾驶证', icon: Car, color: 'bg-purple-50 text-purple-600 border-purple-200' },
  PROFESSIONAL: { label: '职业证书', icon: Briefcase, color: 'bg-rose-50 text-rose-600 border-rose-200' },
  OTHER: { label: '其他', icon: FileType, color: 'bg-gray-50 text-gray-600 border-gray-200' },
};

const NOTIFY_OPTIONS = [
  { value: '7', label: '提前7天' },
  { value: '15', label: '提前15天' },
  { value: '30', label: '提前30天' },
  { value: '60', label: '提前60天' },
  { value: '90', label: '提前90天' },
];

export default function NewLicensePage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 步骤: select(选择类型) | upload(选择上传方式) | form(填写信息)
  const [step, setStep] = useState<'select' | 'upload' | 'form'>('select');
  const [type, setType] = useState('');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [uploadMode, setUploadMode] = useState<'camera' | 'file' | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 表单字段
  const [formData, setFormData] = useState({
    name: '',
    licenseNumber: '',
    issuingAuthority: '',
    issueDate: '',
    expireDate: '',
    notifyDays: '30',
  });

  // 清理摄像头
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }
  }, [stream]);

  // 启动摄像头
  async function startCamera() {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      setStream(s);
      setUploadMode('camera');
      if (videoRef.current) {
        videoRef.current.srcObject = s;
      }
    } catch (err) {
      toast.error('无法启动摄像头', { description: '请检查摄像头权限设置' });
    }
  }

  // 拍照
  function capture() {
    if (!videoRef.current || !canvasRef.current) return;
    canvasRef.current.width = videoRef.current.videoWidth || 1280;
    canvasRef.current.height = videoRef.current.videoHeight || 720;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0);
    const base64 = canvasRef.current.toDataURL('image/jpeg', 0.9);
    stopCamera();
    setImagePreview(base64);
    doOCR(base64);
  }

  // 文件上传
  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setImagePreview(base64);
      setUploadMode('file');
      doOCR(base64);
    };
    reader.readAsDataURL(file);
  }

  // OCR识别
  async function doOCR(imageBase64: string) {
    setOcrLoading(true);
    try {
      const res = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64, type }),
      });
      const result = await res.json();
      if (result.success && result.data) {
        setFormData(prev => ({
          ...prev,
          name: result.data.name || prev.name,
          licenseNumber: result.data.number || prev.licenseNumber,
          issuingAuthority: result.data.authority || prev.issuingAuthority,
          issueDate: result.data.issueDate || prev.issueDate,
          expireDate: result.data.expireDate || prev.expireDate,
        }));
        toast.success('OCR识别完成', { description: '已自动填充识别结果，请核对并补充信息' });
      }
    } catch {
      toast.error('OCR识别失败', { description: '请手动填写证照信息' });
    }
    setOcrLoading(false);
    setStep('form');
  }

  // 选择类型
  function selectType(t: string) {
    setType(t);
    setStep('upload');
    // 自动生成默认名称
    const typeLabel = TYPE_CONFIG[t]?.label || '证照';
    setFormData(prev => ({ ...prev, name: `·${typeLabel}` }));
  }

  // 表单字段更新
  function updateField(field: string, value: string) {
    setFormData(prev => ({ ...prev, [field]: value }));
  }

  // 提交
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.name) {
      toast.error('请填写证照名称');
      return;
    }
    if (!formData.expireDate) {
      toast.error('请选择截止日期');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/licenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          type,
          notifyDays: parseInt(formData.notifyDays),
          attachmentUrl: imagePreview,
          files: imagePreview ? JSON.stringify([imagePreview]) : undefined,
          status: new Date(formData.expireDate) <= new Date() ? 'EXPIRED' : 'ACTIVE',
        }),
      });
      if (!res.ok) throw new Error('创建失败');
      toast.success('证照创建成功');
      router.push('/dashboard/licenses');
    } catch {
      toast.error('创建失败', { description: '请稍后重试' });
    }
    setSubmitting(false);
  }

  // 渲染类型选择
  function renderTypeSelect() {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-lg font-semibold">选择证照类别</h2>
          <p className="text-sm text-muted-foreground mt-1">请选择要新增的证照类型</p>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {Object.entries(TYPE_CONFIG).map(([key, config]) => {
            const Icon = config.icon;
            return (
              <button
                key={key}
                onClick={() => selectType(key)}
                className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-transparent hover:border-primary/50 bg-background hover:bg-accent/50 transition-all group"
              >
                <div className={`p-3 rounded-full ${config.color} group-hover:scale-110 transition-transform`}>
                  <Icon className="h-8 w-8" />
                </div>
                <span className="text-sm font-medium">{config.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // 渲染上传方式
  function renderUpload() {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-lg font-semibold">上传{TYPE_CONFIG[type]?.label}</h2>
          <p className="text-sm text-muted-foreground mt-1">选择上传方式，系统将自动识别证照信息</p>
        </div>

        {/* 摄像头模式 */}
        {uploadMode === 'camera' && stream ? (
          <div className="space-y-4">
            <div className="relative rounded-lg overflow-hidden bg-black">
              <video ref={videoRef} autoPlay playsInline className="w-full max-h-96 object-contain" />
              <canvas ref={canvasRef} className="hidden" />
            </div>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={stopCamera}>取消拍照</Button>
              <Button onClick={capture}>
                <Camera className="h-4 w-4 mr-2" />拍照识别
              </Button>
            </div>
          </div>
        ) : imagePreview ? (
          /* 图片预览 */
          <div className="space-y-4">
            <div className="relative rounded-lg overflow-hidden border max-w-md mx-auto">
              <img src={imagePreview} alt="证照预览" className="w-full object-contain max-h-80" />
              <button
                onClick={() => { setImagePreview(null); setUploadMode(null); }}
                className="absolute top-2 right-2 p-1 rounded-full bg-black/50 text-white hover:bg-black/70"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {ocrLoading ? (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> OCR识别中...
              </div>
            ) : null}
          </div>
        ) : (
          /* 上传选择 */
          <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto">
            <button
              onClick={startCamera}
              className="flex flex-col items-center gap-3 p-8 rounded-xl border-2 border-dashed hover:border-primary/50 hover:bg-accent/50 transition-all"
            >
              <div className="p-3 rounded-full bg-blue-50 text-blue-600">
                <Camera className="h-8 w-8" />
              </div>
              <span className="font-medium">拍照上传</span>
              <span className="text-xs text-muted-foreground">调用摄像头拍摄</span>
            </button>
            <label className="flex flex-col items-center gap-3 p-8 rounded-xl border-2 border-dashed hover:border-primary/50 hover:bg-accent/50 transition-all cursor-pointer">
              <div className="p-3 rounded-full bg-green-50 text-green-600">
                <Upload className="h-8 w-8" />
              </div>
              <span className="font-medium">文件上传</span>
              <span className="text-xs text-muted-foreground">选择图片或PDF</span>
              <input type="file" accept="image/*,.pdf" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        )}

        {/* 跳过OCR直接填写 */}
        {!ocrLoading && !stream && !imagePreview && (
          <div className="text-center">
            <Button variant="ghost" size="sm" onClick={() => setStep('form')}>
              跳过上传，直接填写
            </Button>
          </div>
        )}
      </div>
    );
  }

  // 渲染表单
  function renderForm() {
    return (
      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
        <div className="text-center">
          <h2 className="text-lg font-semibold">填写证照信息</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {ocrLoading ? 'OCR识别中...' : '请核对并补充证照信息，带 * 为必填项'}
          </p>
        </div>

        {/* 图片预览 */}
        {imagePreview && (
          <div className="flex justify-center">
            <div className="relative rounded-lg overflow-hidden border w-48 h-36">
              <img src={imagePreview} alt="证照预览" className="w-full h-full object-contain" />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>证照名称 <span className="text-red-500">*</span></Label>
            <Input
              value={formData.name}
              onChange={e => updateField('name', e.target.value)}
              placeholder="请输入证照名称"
            />
          </div>
          <div className="space-y-2">
            <Label>证照编号</Label>
            <Input
              value={formData.licenseNumber}
              onChange={e => updateField('licenseNumber', e.target.value)}
              placeholder="请输入证照编号"
            />
          </div>
          <div className="space-y-2">
            <Label>发证机关</Label>
            <Input
              value={formData.issuingAuthority}
              onChange={e => updateField('issuingAuthority', e.target.value)}
              placeholder="请输入发证机关"
            />
          </div>
          <div className="space-y-2">
            <Label>签发日期</Label>
            <Input
              type="date"
              value={formData.issueDate}
              onChange={e => updateField('issueDate', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>截止日期 <span className="text-red-500">*</span></Label>
            <Input
              type="date"
              value={formData.expireDate}
              onChange={e => updateField('expireDate', e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>提前提醒</Label>
            <Select value={formData.notifyDays} onValueChange={v => updateField('notifyDays', v)}>
              <SelectTrigger>
                <SelectValue placeholder="选择提醒时间" />
              </SelectTrigger>
              <SelectContent>
                {NOTIFY_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>取消</Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />提交中...</>
            ) : '保存证照'}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-6">
      {/* 顶部导航 */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => {
          if (step === 'upload') { stopCamera(); setStep('select'); }
          else if (step === 'form') { setStep('upload'); }
          else router.back();
        }}>
          <ArrowLeft className="h-4 w-4 mr-1" /> 返回
        </Button>
        <div>
          <h1 className="text-2xl font-bold">新增证照</h1>
          <p className="text-sm text-muted-foreground">添加新的证照信息</p>
        </div>
      </div>

      {/* 步骤指示器 */}
      <div className="flex items-center gap-2 text-sm">
        {['选择类别', '上传证照', '填写信息'].map((label, i) => {
          const steps = ['select', 'upload', 'form'];
          const currentIdx = steps.indexOf(step);
          const isActive = i === currentIdx;
          const isDone = i < currentIdx;
          return (
            <div key={label} className="flex items-center gap-2">
              <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium ${
                isDone ? 'bg-green-500 text-white' :
                isActive ? 'bg-primary text-primary-foreground' :
                'bg-muted text-muted-foreground'
              }`}>
                {isDone ? '✓' : i + 1}
              </div>
              <span className={isActive ? 'font-medium text-foreground' : 'text-muted-foreground'}>{label}</span>
              {i < 2 && <div className="w-8 h-px bg-border" />}
            </div>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-6">
          {step === 'select' && renderTypeSelect()}
          {step === 'upload' && renderUpload()}
          {step === 'form' && renderForm()}
        </CardContent>
      </Card>
    </div>
  );
}
