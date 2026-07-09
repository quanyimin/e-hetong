'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Camera, Upload, RotateCcw, Check, AlertCircle, Loader2, FileText, Scan } from 'lucide-react';

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
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

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
      // 第一步：创建合同记录（含 OCR 文本）
      const contractRes = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: '拍照合同' + new Date().toLocaleDateString('zh-CN'),
          ocrText: ocrText,
          source: 'CAMERA_OCR',
          fileUrl: capturedImage,
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
        await fetch('/api/ai/parse-contract', {
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
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-green-700">
                    <Check className="h-4 w-4" />
                    已识别文字 ({ocrText.length}字符)
                  </div>
                  <textarea
                    className="w-full h-24 p-2 text-xs border rounded-lg bg-muted/30 resize-none"
                    value={ocrText}
                    onChange={e => setOcrText(e.target.value)}
                    placeholder="OCR识别结果可在此编辑修正..."
                  />
                  <p className="text-xs text-muted-foreground">可手动修正识别结果，AI将根据修正后的文字解析</p>
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
                <Button onClick={uploadAndParse} disabled={uploading} size="lg" className="gap-2">
                  {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileText className="h-5 w-5" />}
                  {uploading ? '上传解析中...' : '确认上传并解析'}
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
