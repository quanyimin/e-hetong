'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Camera, Upload, RotateCcw, Check, AlertCircle, Loader2 } from 'lucide-react';

export default function CameraPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
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
  }

  // 重新拍摄
  function retake() {
    setCapturedImage(null);
    startCamera();
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
      setCapturedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  // 上传并解析
  async function uploadAndParse() {
    if (!capturedImage) return;
    setUploading(true);
    setError(null);
    try {
      // 将 base64 转换为 Blob
      const response = await fetch(capturedImage);
      const blob = await response.blob();
      const formData = new FormData();
      formData.append('file', blob, `contract_${Date.now()}.jpg`);

      const uploadRes = await fetch('/api/contracts', {
        method: 'POST',
        body: formData,
      });
      
      if (!uploadRes.ok) {
        const errData = await uploadRes.json();
        throw new Error(errData.error || '上传失败');
      }

      const result = await uploadRes.json();
      
      // 触发 AI 解析
      if (result.contract?.id) {
        await fetch('/api/ai/parse-contract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contractId: result.contract.id, fileUrl: result.contract.fileUrl || '' }),
        });
        
        // 跳转到合同详情
        router.push(`/dashboard/contracts/${result.contract.id}`);
      } else {
        router.push('/dashboard/contracts');
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
        <p className="text-sm text-muted-foreground mt-1">拍摄合同文件，AI 自动识别并归档</p>
      </div>

      <Card>
        <CardContent className="p-4">
          {/* 摄像头预览 / 拍照结果 */}
          {!stream && !capturedImage && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Camera className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-6">点击下方按钮启动摄像头拍摄合同</p>
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

          {/* 摄像头预览 */}
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

          {/* 拍照结果预览 */}
          {capturedImage && (
            <div className="space-y-4">
              <div className="relative bg-black rounded-lg overflow-hidden">
                <img src={capturedImage} alt="拍摄的合同" className="w-full h-auto max-h-[60vh] object-contain" />
              </div>
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
                  {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
                  {uploading ? '正在解析...' : '确认上传并解析'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 使用提示 */}
      {!stream && !capturedImage && (
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <h3 className="text-sm font-medium mb-2">📌 拍摄建议</h3>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• 确保合同平整、光线充足</li>
              <li>• 尽量拍全整页内容，避免遮挡</li>
              <li>• 多页合同请逐页拍摄上传</li>
              <li>• 支持 JPG / PNG 格式，AI 自动识别关键信息</li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
