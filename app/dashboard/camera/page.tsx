'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Camera, Upload, RotateCcw, Check, AlertCircle, Loader2, FileText, Scan, BadgeCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { uploadBase64Image } from '@/lib/client-upload';

export default function CameraPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState('');
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrStatus, setOcrStatus] = useState<'idle' | 'processing' | 'done' | 'error'>('idle');
  const [uploading, setUploading] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<'contract' | 'license'>('contract');
  const [error, setError] = useState<string | null>(null);
  const { tenant } = useAuth();
  const tenantId = tenant?.tenantId || 'default';
  const router = useRouter();

  // 证照表单
  const [licenseForm, setLicenseForm] = useState({
    name: '',
    type: '营业执照',
    issuingAuthority: '',
    validUntil: '',
    licenseNumber: '',
  });

  // 启动摄像头
  async function startCamera() {
    setError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (e: any) {
      if (e.name === 'NotAllowedError') {
        setError('请允许使用摄像头');
      } else if (e.name === 'NotFoundError') {
        setError('未找到摄像头设备');
      } else {
        setError('无法启动摄像头: ' + (e.message || ''));
      }
    }
  }

  // 拍照
  function capture() {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedImage(dataUrl);
    // 停止摄像头
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }
    // 自动触发 OCR
    runOCR(dataUrl);
  }

  // 选择文件
  function selectFile() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setCapturedImage(dataUrl);
      runOCR(dataUrl);
    };
    reader.readAsDataURL(file);
  }

  // OCR 识别（优先千帆 → 降级 Tesseract.js）
  async function runOCR(imageData: string) {
    setOcrStatus('processing');
    setOcrProgress(10);
    try {
      // 第一步：尝试千帆 OCR（服务器端，更准确）
      setOcrProgress(20);
      const qianfanRes = await fetch('/api/ocr/qianfan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData }),
      });

      if (qianfanRes.ok) {
        const qianfanData = await qianfanRes.json();
        if (qianfanData.text && qianfanData.text.trim().length > 5) {
          setOcrProgress(100);
          setOcrText(qianfanData.text);
          setOcrStatus('done');
          return;
        }
      }

      // 第二步：千帆未配置或结果为空，降级到 Tesseract.js
      console.log('[OCR] 千帆不可用，降级到 Tesseract.js');
      const Tesseract = await import('tesseract.js');
      setOcrProgress(30);

      const result = await Tesseract.recognize(imageData, 'chi_sim+eng', {
        logger: (m: any) => {
          if (m.status === 'recognizing text') {
            setOcrProgress(Math.min(30 + Math.round(m.progress * 60), 90));
          }
        },
      });

      setOcrProgress(100);
      setOcrText(result.data.text);
      setOcrStatus('done');
    } catch (e: any) {
      console.error('[OCR] 识别出错:', e);
      setOcrStatus('error');
      setError('文字识别失败，可直接上传由AI处理');
    }
  }

  // 重新拍摄
  function retake() {
    setCapturedImage(null);
    setOcrText('');
    setOcrProgress(0);
    setOcrStatus('idle');
    setError(null);
    startCamera();
  }

  // 上传并解析
  async function uploadAndParse() {
    if (!capturedImage) return;
    setUploading(true);
    setError(null);
    try {
      if (archiveTarget === 'license') {
        // 先上传文件到隔离存储
        let attachmentUrl = capturedImage;
        try {
          const uploadResult = await uploadBase64Image(capturedImage, `license_${Date.now()}.jpg`);
          attachmentUrl = uploadResult.publicUrl;
        } catch (uploadErr) {
          console.warn('文件上传失败，使用 base64 兜底:', uploadErr);
        }

        // 归档到证照管理
        const licenseRes = await fetch(`/api/licenses?tenantId=${encodeURIComponent(tenantId)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: licenseForm.name || '拍照证照' + new Date().toLocaleDateString('zh-CN'),
            type: licenseForm.type,
            issuingAuthority: licenseForm.issuingAuthority,
            expireDate: licenseForm.validUntil,
            licenseNumber: licenseForm.licenseNumber,
            attachmentUrl,
            files: JSON.stringify([capturedImage]),
            metadata: JSON.stringify({ ocrText }),
          }),
        });

        if (!licenseRes.ok) {
          const errData = await licenseRes.json();
          throw new Error(errData.message || errData.error || '创建证照失败');
        }

        // 跳转到证照列表
        router.push('/dashboard/licenses');
      } else {
        // 先上传文件到隔离存储
        let fileUrl = capturedImage;
        try {
          const uploadResult = await uploadBase64Image(capturedImage, `contract_${Date.now()}.jpg`);
          fileUrl = uploadResult.publicUrl;
        } catch (uploadErr) {
          console.warn('文件上传失败，使用 base64 兜底:', uploadErr);
        }

        // 归档到合同管理
        const contractRes = await fetch(`/api/contracts?tenantId=${encodeURIComponent(tenantId)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: '拍照合同' + new Date().toLocaleDateString('zh-CN'),
            ocrText: ocrText,
            source: 'CAMERA_OCR',
            fileUrl,
          }),
        });

        if (!contractRes.ok) {
          const errData = await contractRes.json();
          throw new Error(errData.message || errData.error || '创建合同失败');
        }

        const contractResult = await contractRes.json();
        const contractId = contractResult.data?.id;

        if (!contractId) {
          throw new Error('创建合同失败：未返回合同ID');
        }

        // 第二步：触发 AI 解析（传入 OCR 文本）
        if (ocrText && ocrText.trim().length >= 10) {
          await fetch(`/api/ai/parse-contract?tenantId=${encodeURIComponent(tenantId)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contractId: contractId,
              ocrText: ocrText,
              text: ocrText,
              fileName: '拍照合同',
            }),
          });
        }

        // 跳转到合同详情
        router.push(`/dashboard/contracts/${contractId}`);
      }
    } catch (e: any) {
      setError(e.message || '上传失败，请重试');
    }
    setUploading(false);
  }

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      <div>
        <h1 className="text-xl font-bold">拍照上传合同</h1>
        <p className="text-sm text-muted-foreground mt-1">拍摄 → 自动识别文字 → AI解析归档</p>
      </div>

      <Card>
        <CardContent className="p-4">
          {/* 初始界面：打开摄像头 / 选择文件 */}
          {!stream && !capturedImage && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Camera className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-6">拍照后自动OCR识别文字，AI解析归档</p>
              <div className="flex flex-col gap-3 w-full max-w-xs">
                <Button onClick={startCamera} size="lg" className="gap-2">
                  <Camera className="h-5 w-5" /> 打开摄像头
                </Button>
                <Button variant="outline" onClick={selectFile} size="lg" className="gap-2">
                  <Upload className="h-5 w-5" /> 从相册选择
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            </div>
          )}

          {/* 摄像头取景 */}
          {stream && !capturedImage && (
            <div className="space-y-4">
              <div className="relative bg-black rounded-lg overflow-hidden">
                <video ref={videoRef} autoPlay playsInline className="w-full h-auto max-h-[60vh] object-contain" />
              </div>
              <div className="flex justify-center gap-3">
                <Button onClick={selectFile} variant="outline" className="gap-2">
                  <Upload className="h-4 w-4" /> 选文件
                </Button>
                <Button onClick={capture} size="lg" className="gap-2">
                  <Camera className="h-5 w-5" /> 拍照
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            </div>
          )}

          {/* 拍照结果 + OCR */}
          {capturedImage && (
            <div className="space-y-4">
              <div className="relative bg-black rounded-lg overflow-hidden">
                <img src={capturedImage} alt="合同照片" className="w-full h-auto max-h-[50vh] object-contain" />
              </div>

              {/* OCR 进度 */}
              {ocrStatus === 'processing' && (
                <div className="space-y-2 p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-blue-700">
                    <Scan className="h-4 w-4 animate-pulse" />
                    正在识别文字...
                  </div>
                  <Progress value={ocrProgress} className="h-1.5" />
                </div>
              )}

              {/* OCR 结果 */}
              {ocrStatus === 'done' && ocrText && (
                <div className="space-y-4">
                  {/* 归档选择 */}
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <h3 className="text-sm font-medium mb-3">归档到：</h3>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setArchiveTarget('contract')}
                        className={`flex-1 p-3 rounded-lg border-2 text-center transition-colors ${
                          archiveTarget === 'contract' ? 'border-primary bg-primary/5' : 'border-muted'
                        }`}
                      >
                        <FileText className="h-5 w-5 mx-auto mb-1" />
                        <p className="text-xs font-medium">合同管理</p>
                      </button>
                      <button
                        onClick={() => setArchiveTarget('license')}
                        className={`flex-1 p-3 rounded-lg border-2 text-center transition-colors ${
                          archiveTarget === 'license' ? 'border-primary bg-primary/5' : 'border-muted'
                        }`}
                      >
                        <BadgeCheck className="h-5 w-5 mx-auto mb-1" />
                        <p className="text-xs font-medium">证照管理</p>
                      </button>
                    </div>
                  </div>

                  {/* 证照表单（归档到证照时显示） */}
                  {archiveTarget === 'license' && (
                    <div className="space-y-3 p-3 rounded-lg border">
                      <h3 className="text-sm font-medium">证照信息</h3>
                      <div className="grid grid-cols-1 gap-2">
                        <div>
                          <Label className="text-xs">证照名称</Label>
                          <Input value={licenseForm.name} onChange={e => setLicenseForm(f => ({ ...f, name: e.target.value }))}
                            placeholder="输入证照名称" className="h-9 text-sm" />
                        </div>
                        <div>
                          <Label className="text-xs">证照类型</Label>
                          <select value={licenseForm.type} onChange={e => setLicenseForm(f => ({ ...f, type: e.target.value }))}
                            className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm">
                            <option>营业执照</option>
                            <option>身份证</option>
                            <option>资质证书</option>
                            <option>许可证</option>
                            <option>其他</option>
                          </select>
                        </div>
                        <div>
                          <Label className="text-xs">发证机关</Label>
                          <Input value={licenseForm.issuingAuthority} onChange={e => setLicenseForm(f => ({ ...f, issuingAuthority: e.target.value }))}
                            placeholder="发证机关" className="h-9 text-sm" />
                        </div>
                        <div>
                          <Label className="text-xs">有效期至</Label>
                          <Input type="date" value={licenseForm.validUntil} onChange={e => setLicenseForm(f => ({ ...f, validUntil: e.target.value }))}
                            className="h-9 text-sm" />
                        </div>
                        <div>
                          <Label className="text-xs">证照编号</Label>
                          <Input value={licenseForm.licenseNumber} onChange={e => setLicenseForm(f => ({ ...f, licenseNumber: e.target.value }))}
                            placeholder="证照编号" className="h-9 text-sm" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* OCR 文本显示 */}
                  <div className="p-3 rounded-lg bg-muted/20 border">
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-xs text-muted-foreground">OCR 识别原文</Label>
                      <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => navigator.clipboard.writeText(ocrText)}>
                        复制
                      </Button>
                    </div>
                    <textarea className="w-full text-xs text-muted-foreground bg-transparent border-0 resize-none focus:outline-none"
                      rows={4} value={ocrText} onChange={e => setOcrText(e.target.value)} />
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <div className="flex justify-center gap-3">
                <Button onClick={retake} variant="outline" disabled={uploading} className="gap-2">
                  <RotateCcw className="h-4 w-4" /> 重拍
                </Button>
                <Button onClick={uploadAndParse} disabled={uploading || ocrStatus !== 'done'} size="lg" className="gap-2">
                  {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileText className="h-5 w-5" />}
                  {uploading ? '上传解析中...' : archiveTarget === 'license' ? '确认归档至证照' : '确认上传并解析'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 流程提示 */}
      {!stream && !capturedImage && (
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <h3 className="text-sm font-medium mb-2">📌 流程说明</h3>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>① 拍照 / 选择相册图片</p>
              <p>② 自动 OCR 识别文字 → 可手动修正</p>
              <p>③ AI 解析归档 → 自动添加到合同库</p>
              <p>④ 支持多页合同逐页拍摄</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 隐藏的 canvas 用于截图 */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
