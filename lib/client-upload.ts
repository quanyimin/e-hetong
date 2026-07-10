/**
 * 前端文件上传工具
 *
 * 用法：
 *   import { uploadFile, uploadBase64Image } from '@/lib/client-upload';
 *
 *   // 上传 File 对象
 *   const result = await uploadFile(fileInput.files[0]);
 *
 *   // 上传 base64 图片（拍照）
 *   const result = await uploadBase64Image(base64DataUrl, 'photo.jpg');
 */

export interface UploadResult {
  publicUrl: string;
  storagePath: string;
  fileName: string;
  fileSize: number;
  fileType: string;
}

/**
 * 上传 File 对象到服务器（身份隔离存储）
 * 自动从 localStorage 读取身份信息注入请求头
 */
export async function uploadFile(file: File): Promise<UploadResult> {
  const formData = new FormData();
  formData.append('file', file);

  // 注入身份信息请求头
  const headers: Record<string, string> = {};
  try {
    const tenant = localStorage.getItem('ehetong_tenant');
    if (tenant) {
      const t = JSON.parse(tenant);
      headers['x-identity-type'] = t.identityType || 'PERSONAL';
      headers['x-org-id'] = t.tenantId;
    }
    const user = localStorage.getItem('ehetong_user');
    if (user) {
      headers['x-user-id'] = JSON.parse(user).id;
    }
  } catch { /* ignore */ }

  const res = await fetch('/api/upload', {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '上传失败' }));
    throw new Error(err.error || '上传失败');
  }

  return res.json();
}

/**
 * 上传 base64 格式的图片到服务器
 * 用于拍照上传场景
 */
export async function uploadBase64Image(
  base64DataUrl: string,
  fileName: string = `photo_${Date.now()}.jpg`
): Promise<UploadResult> {
  // base64 → Blob
  const res = await fetch(base64DataUrl);
  const blob = await res.blob();
  const file = new File([blob], fileName, { type: blob.type });

  return uploadFile(file);
}
