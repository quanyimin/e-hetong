'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { extractTextFromFile } from '@/lib/file-text-extractor';
import { getPreviewType, docxToHtml, readFileAsArrayBuffer, getPdfBlobUrl } from '@/lib/file-preview';
import {
  Upload, FileText, X, CheckCircle2, Loader2, AlertCircle, Brain, Sparkles,
  Camera, Crown, AlertTriangle, Save, Eye, DollarSign, Tag, Maximize2, ExternalLink,
} from 'lucide-react';

interface AIParseResult {
  contractName: string; contractType: string; partyA: string; partyB: string;
  amount: number | null; amountText: string; startDate: string; endDate: string;
  keyClauses: string[]; riskAlerts: string[]; summary: string; keywords: string[];
}

interface FileItem {
  id: string; file: File; name: string; text: string; size: number; ext: string;
  previewUrl?: string;           // blob URL（图片用）
  docxHtml?: string;             // DOCX转HTML
  pdfUrl?: string;               // PDF blob URL
  status: 'pending' | 'uploading' | 'parsing' | 'review' | 'archived' | 'error';
  error?: string; parseResult?: AIParseResult; confirmedData?: Partial<AIParseResult>;
}

const ACCEPTED_TYPES = '.pdf,.docx,.doc,.jpg,.jpeg,.png,.gif,.bmp,.webp';
const CONTRACT_TYPES = ['买卖合同', '租赁合同', '劳动合同', '服务合同', '借款合同', '承揽合同', '技术合同', '保密协议', '合伙协议', '其他'];

async function callAIParse(fileName: string, text: string): Promise<AIParseResult> {
  const res = await fetch('/api/ai/parse-contract', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName, text }),
  });
  if (!res.ok) throw new Error(`AI解析失败: ${await res.text()}`);
  const data = await res.json();
  return data.data;
}

/** 为文件生成预览 */
async function generatePreview(file: File, ext: string): Promise<Partial<FileItem>> {
  const result: Partial<FileItem> = {};

  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext)) {
    result.previewUrl = URL.createObjectURL(file);
  } else if (ext === 'pdf') {
    const buf = await readFileAsArrayBuffer(file);
    result.pdfUrl = getPdfBlobUrl(buf);
  } else if (ext === 'docx') {
    try {
      const buf = await readFileAsArrayBuffer(file);
      result.docxHtml = await docxToHtml(buf);
    } catch { result.docxHtml = '<p>无法预览此DOCX文件</p>'; }
  }

  return result;
}

export default function UploadContractPage() {
  const router = useRouter();
  const [files, setFiles] = React.useState<FileItem[]>([]);
  const [isDragging, setIsDragging] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);
  const [fullscreenFile, setFullscreenFile] = React.useState<FileItem | null>(null);

  const addFiles = async (newFiles: File[]) => {
    const valid = newFiles.filter((f) => {
      const ext = f.name.split('.').pop()?.toLowerCase() || '';
      return ['pdf', 'docx', 'doc', 'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext);
    });

    const items: FileItem[] = [];
    for (const file of valid) {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'unknown';
      const preview = await generatePreview(file, ext);
      items.push({
        id: Math.random().toString(36).substring(7), file, name: file.name,
        text: '', size: file.size, ext,
        ...preview,
        status: 'pending' as const,
      });
    }
    setFiles((prev) => [...prev, ...items]);
  };

  const cleanupFile = (f: FileItem) => {
    if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
    if (f.pdfUrl) URL.revokeObjectURL(f.pdfUrl);
  };

  const removeFile = (id: string) => {
    setFiles((prev) => { const f = prev.find((x) => x.id === id); if (f) cleanupFile(f); return prev.filter((x) => x.id !== id); });
  };

  const uploadAndParse = async () => {
    const pendingFiles = files.filter((f) => f.status === 'pending' || f.status === 'error');
    // 并发处理，最多同时 3 个，避免浏览器连接池占满
    const CONCURRENCY = 3;
    const queue = [...pendingFiles];
    const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
      while (queue.length > 0) {
        const file = queue.shift()!;
        setFiles((prev) => prev.map((f) => (f.id === file.id ? { ...f, status: 'uploading' as const } : f)));
        try {
          const fileText = await extractTextFromFile(file.file);
          setFiles((prev) => prev.map((f) => (f.id === file.id ? { ...f, text: fileText, status: 'parsing' as const } : f)));
          const result = await callAIParse(file.name, fileText);
          setFiles((prev) => prev.map((f) => f.id === file.id ? { ...f, status: 'review' as const, parseResult: result, confirmedData: { ...result } } : f));
        } catch (err) {
          setFiles((prev) => prev.map((f) => f.id === file.id ? { ...f, status: 'error' as const, error: err instanceof Error ? err.message : '解析失败' } : f));
        }
      }
    });
    await Promise.all(workers);
  };

  const updateField = (fileId: string, field: string, value: any) => {
    setFiles((prev) => prev.map((f) => f.id === fileId ? { ...f, confirmedData: { ...(f.confirmedData || f.parseResult), [field]: value } as any } : f));
  };

  const handleArchive = async (fileId: string) => {
    const file = files.find((f) => f.id === fileId);
    if (!file) return;
    try {
      await fetch('/api/contracts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: file.confirmedData?.contractName || file.name,
          type: file.confirmedData?.contractType || '', partyA: file.confirmedData?.partyA || '',
          partyB: file.confirmedData?.partyB || '', amount: file.confirmedData?.amount || null,
          startDate: file.confirmedData?.startDate || null, endDate: file.confirmedData?.endDate || null,
          keywords: JSON.stringify(file.confirmedData?.keywords || []),
          summary: file.confirmedData?.summary || '',
          keyClauses: JSON.stringify(file.confirmedData?.keyClauses || []),
          riskAlerts: JSON.stringify(file.confirmedData?.riskAlerts || []),
          fileType: file.ext, archived: true,
        }),
      });
    } catch (e) { console.error('保存失败', e); }
    setFiles((prev) => prev.map((f) => f.id === fileId ? { ...f, status: 'archived' as const } : f));
  };

  const formatSize = (b: number) => b < 1024 ? b + 'B' : b < 1048576 ? (b / 1024).toFixed(1) + 'KB' : (b / 1048576).toFixed(1) + 'MB';
  const isSupportCamera = typeof window !== 'undefined' && 'capture' in HTMLInputElement.prototype;
  const allArchived = files.length > 0 && files.every((f) => f.status === 'archived');

  /** 全屏预览 Modal */
  const FullscreenModal = ({ file, onClose }: { file: FileItem; onClose: () => void }) => {
    const previewType = getPreviewType(file.ext);
    React.useEffect(() => {
      const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
      window.addEventListener('keydown', handleKey);
      return () => window.removeEventListener('keydown', handleKey);
    }, [onClose]);
    return (
      <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
        onClick={onClose}>
        <div className="w-full h-full max-w-6xl max-h-[90vh] m-4 relative flex items-center justify-center"
          onClick={(e) => e.stopPropagation()}>
          <button onClick={onClose}
            className="absolute top-2 right-2 z-10 bg-black/50 text-white rounded-full p-2 hover:bg-black/70 transition-colors">
            <X className="h-6 w-6" />
          </button>
          {previewType === 'image' && file.previewUrl ? (
            <img src={file.previewUrl} alt="" className="max-w-full max-h-full object-contain" />
          ) : previewType === 'pdf' && file.pdfUrl ? (
            <iframe src={file.pdfUrl} className="w-full h-full rounded" title="PDF全屏预览" />
          ) : previewType === 'docx' && file.docxHtml ? (
            <div className="w-full h-full overflow-y-auto bg-white rounded-lg p-6 text-sm"
              dangerouslySetInnerHTML={{ __html: file.docxHtml }} />
          ) : (
            <div className="text-white text-center">
              <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p>无法预览此文件类型</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  /** 文件预览组件 */
  const FilePreview = ({ file }: { file: FileItem }) => {
    const previewType = getPreviewType(file.ext);

    switch (previewType) {
      case 'image':
        return file.previewUrl ? (
          <img src={file.previewUrl} alt="" className="w-full object-contain min-h-[300px] max-h-[55vh] cursor-pointer rounded border bg-muted/10"
            onClick={() => setFullscreenFile(file)} />
        ) : null;

      case 'pdf':
        return file.pdfUrl ? (
          <div className="relative">
            <iframe src={file.pdfUrl} className="w-full min-h-[300px] h-[55vh] rounded border" title="PDF预览" />
            <div className="absolute top-2 right-2 flex gap-1">
              <button onClick={() => setFullscreenFile(file)}
                className="bg-background/90 rounded-md px-2 py-1 text-xs shadow-sm hover:bg-background flex items-center gap-1">
                <Maximize2 className="h-3 w-3" />全屏
              </button>
              <a href={file.pdfUrl} target="_blank" rel="noopener noreferrer"
                className="bg-background/90 rounded-md px-2 py-1 text-xs shadow-sm hover:bg-background flex items-center gap-1">
                <ExternalLink className="h-3 w-3" />新窗口
              </a>
            </div>
          </div>
        ) : (
          <div className="border rounded-lg p-8 text-center bg-muted/20">
            <FileText className="h-10 w-10 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">PDF 文件（{formatSize(file.size)}）</p>
            {file.pdfUrl && (
              <a href={file.pdfUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-1 inline-block">在新窗口打开</a>
            )}
          </div>
        );

      case 'docx':
        return file.docxHtml ? (
          <div className="border rounded-lg p-4 min-h-[300px] max-h-[55vh] overflow-y-auto bg-white text-sm"
            dangerouslySetInnerHTML={{ __html: file.docxHtml }} />
        ) : (
          <div className="border rounded-lg p-8 text-center bg-muted/20">
            <FileText className="h-10 w-10 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Word 文档（{formatSize(file.size)}）</p>
          </div>
        );

      default:
        return (
          <div className="border rounded-lg p-8 text-center bg-muted/20 min-h-[300px] flex flex-col items-center justify-center">
            <FileText className="h-10 w-10 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">{file.ext.toUpperCase()} 文件（{formatSize(file.size)}）</p>
          </div>
        );
    }
  };

  const StatusBadge = ({ status }: { status: FileItem['status'] }) => {
    switch (status) {
      case 'pending': return <Badge variant="outline">待上传</Badge>;
      case 'uploading': return <div className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin text-primary" /><span className="text-muted-foreground">文本提取中...</span></div>;
      case 'parsing': return <div className="flex items-center gap-2 text-sm"><Brain className="h-4 w-4 animate-pulse text-amber-500" /><span className="text-amber-600 font-medium">AI 解析中...</span></div>;
      case 'review': return <Badge variant="warning" className="animate-pulse">待确认</Badge>;
      case 'archived': return <Badge variant="success">已归档</Badge>;
      case 'error': return <Badge variant="destructive">失败</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold tracking-tight">上传合同</h1>
        <p className="text-muted-foreground mt-1">AI 自动抽取关键信息，对照源文件核对后归档</p>
      </div>

      {/* 上传区域 */}
      <Card>
        <CardContent className="p-8">
          <div className={cn('relative border-2 border-dashed rounded-xl p-12 text-center transition-colors',
            isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-muted-foreground/50')}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); addFiles(Array.from(e.dataTransfer.files)); }}>
            <input ref={fileInputRef} type="file" multiple accept={ACCEPTED_TYPES} className="hidden" onChange={(e) => { if (e.target.files) { addFiles(Array.from(e.target.files)); e.target.value = ''; } }} />
            <input ref={cameraInputRef} type="file" multiple accept="image/*" capture="environment" className="hidden" onChange={(e) => { if (e.target.files) { addFiles(Array.from(e.target.files)); e.target.value = ''; } }} />
            <div className="flex flex-col items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center"><Upload className="h-8 w-8 text-primary" /></div>
              <div>
                <p className="text-lg font-medium">拖拽文件到此处，或 <button className="text-primary underline-offset-4 hover:underline font-medium" onClick={() => fileInputRef.current?.click()}>选择文件</button></p>
                <p className="text-sm text-muted-foreground mt-1">支持 PDF、Word、图片 — 浏览器内直接预览</p>
              </div>
              <div className="flex gap-3 mt-2">
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-2"><FileText className="h-4 w-4" />选择文件</Button>
                {isSupportCamera && <Button variant="outline" size="sm" onClick={() => cameraInputRef.current?.click()} className="gap-2"><Camera className="h-4 w-4" />拍照上传</Button>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 文件列表 */}
      {files.length > 0 && (
        <div className="space-y-4">
          <Card>
            <CardContent className="p-3 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {files.filter((f) => f.status === 'archived').length}/{files.length} 个已归档 · {files.filter((f) => f.status === 'review').length} 个待确认
              </span>
              <div className="flex gap-2">
                {files.some((f) => f.status === 'pending' || f.status === 'error') && (
                  <Button size="sm" onClick={uploadAndParse}><Brain className="h-4 w-4 mr-1" />上传并解析</Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => { files.forEach(cleanupFile); setFiles([]); }}><X className="h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>

          {files.map((file) => (
            <Card key={file.id} className="overflow-hidden">
              {/* 文件头 */}
              <div className="flex items-center gap-4 p-4 border-b bg-muted/5">
                <div className="h-14 w-10 rounded border bg-background flex items-center justify-center shrink-0 overflow-hidden">
                  {file.previewUrl ? (
                    <img src={file.previewUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <FileText className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatSize(file.size)} · {file.ext.toUpperCase()}</p>
                </div>
                <StatusBadge status={file.status} />
                {(file.status === 'pending' || file.status === 'error') && (
                  <button onClick={() => removeFile(file.id)} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></button>
                )}
              </div>

              {/* AI解析结果 - 双栏布局 */}
              {file.status === 'review' && file.confirmedData && (
                <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x">
                  {/* 左栏：源文件预览 */}
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">源文件</span>
                      {(file.previewUrl || file.pdfUrl) && (
                        <a href={file.previewUrl || file.pdfUrl} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline ml-auto flex items-center gap-1">
                          <Maximize2 className="h-3 w-3" />新窗口打开
                        </a>
                      )}
                    </div>
                    <FilePreview file={file} />
                    {/* 原文内容可展开 */}
                    <details className="mt-2">
                      <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">查看提取的文本内容</summary>
                      <div className="mt-1 p-2 rounded bg-muted/30 text-xs text-muted-foreground whitespace-pre-wrap max-h-32 overflow-y-auto font-mono">
                        {file.text.slice(0, 3000)}
                        {file.text.length > 3000 && <p className="text-primary mt-1">...（仅显示前3000字符）</p>}
                      </div>
                    </details>
                  </div>

                  {/* 右栏：AI抽取结果 */}
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Brain className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">AI 抽取结果</span>
                      <Badge variant="outline" className="text-xs ml-auto">可编辑</Badge>
                    </div>

                    <div className="space-y-3">
                      {/* 金额 */}
                      <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200">
                        <div className="flex items-center gap-2 mb-1">
                          <DollarSign className="h-5 w-5 text-green-600" />
                          <span className="text-xs text-muted-foreground">合同金额</span>
                          {file.confirmedData.amountText && <span className="text-xs text-muted-foreground">原文：{file.confirmedData.amountText}</span>}
                        </div>
                        <Input type="number" value={file.confirmedData.amount ?? ''}
                          onChange={(e) => updateField(file.id, 'amount', e.target.value ? Number(e.target.value) : null)}
                          className="h-10 text-lg font-bold text-green-700" placeholder="输入金额（元）" />
                      </div>

                      {/* 基本信息 */}
                      <div className="grid grid-cols-2 gap-2">
                        <div><Label className="text-xs">甲方</Label><Input value={file.confirmedData.partyA || ''} onChange={(e) => updateField(file.id, 'partyA', e.target.value)} className="h-9 text-sm" /></div>
                        <div><Label className="text-xs">乙方</Label><Input value={file.confirmedData.partyB || ''} onChange={(e) => updateField(file.id, 'partyB', e.target.value)} className="h-9 text-sm" /></div>
                        <div><Label className="text-xs">合同名称</Label><Input value={file.confirmedData.contractName || ''} onChange={(e) => updateField(file.id, 'contractName', e.target.value)} className="h-9 text-sm" /></div>
                        <div><Label className="text-xs">类型</Label>
                          <select value={file.confirmedData.contractType || ''} onChange={(e) => updateField(file.id, 'contractType', e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm">
                            {CONTRACT_TYPES.map((t) => <option key={t}>{t}</option>)}
                          </select>
                        </div>
                        <div><Label className="text-xs">开始日期</Label><Input type="date" value={file.confirmedData.startDate || ''} onChange={(e) => updateField(file.id, 'startDate', e.target.value)} className="h-9 text-sm" /></div>
                        <div><Label className="text-xs">结束日期</Label><Input type="date" value={file.confirmedData.endDate || ''} onChange={(e) => updateField(file.id, 'endDate', e.target.value)} className="h-9 text-sm" /></div>
                      </div>

                      {/* 关键词 */}
                      <div><Label className="text-xs flex items-center gap-1"><Tag className="h-3 w-3" />关键词</Label>
                        <div className="flex gap-1 mt-1">
                          {(file.confirmedData.keywords || ['', '', '']).map((kw: string, i: number) => (
                            <Input key={i} value={kw} onChange={(e) => {
                              const kws = [...(file.confirmedData?.keywords || ['', '', ''])];
                              kws[i] = e.target.value; updateField(file.id, 'keywords', kws);
                            }} placeholder={`#${i + 1}`} className="h-8 text-sm flex-1" />
                          ))}
                        </div>
                      </div>

                      {/* 关键条款 */}
                      {file.confirmedData.keyClauses && file.confirmedData.keyClauses.length > 0 && (
                        <div><Label className="text-xs">关键条款</Label>
                          {(file.confirmedData.keyClauses || []).map((clause: string, i: number) => (
                            <Input key={i} value={clause} onChange={(e) => {
                              const clauses = [...(file.confirmedData?.keyClauses || [])];
                              clauses[i] = e.target.value; updateField(file.id, 'keyClauses', clauses);
                            }} className="h-8 text-sm mt-1" />
                          ))}
                        </div>
                      )}

                      {/* 风险 */}
                      {file.confirmedData.riskAlerts && file.confirmedData.riskAlerts.length > 0 && (
                        <div className="p-2 rounded bg-amber-50 border border-amber-200">
                          <p className="text-xs font-medium text-amber-700 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />风险提示</p>
                          {file.confirmedData.riskAlerts.map((alert: string, i: number) => <p key={i} className="text-xs text-amber-600 mt-0.5">• {alert}</p>)}
                        </div>
                      )}

                      <Button size="sm" className="w-full" onClick={() => handleArchive(file.id)}>
                        <Save className="h-4 w-4 mr-1" />确认归档
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {file.status === 'archived' && (
                <div className="p-3 bg-green-50 border-t flex items-center gap-2 text-sm text-green-700">
                  <CheckCircle2 className="h-4 w-4" />已归档至合同库
                </div>
              )}
            </Card>
          ))}

          {allArchived && (
            <Card className="border-green-200 bg-green-50/50">
              <CardContent className="p-4 flex items-center justify-between">
                <span className="text-sm font-medium text-green-700">✅ 全部文件已确认归档</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => { files.forEach(cleanupFile); setFiles([]); }}>继续上传</Button>
                  <Button size="sm" onClick={() => router.push('/dashboard/contracts')}>查看合同库</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* 全屏预览 */}
      {fullscreenFile && <FullscreenModal file={fullscreenFile} onClose={() => setFullscreenFile(null)} />}
    </div>
  );
}
