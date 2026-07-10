/**
 * 文件上传 API（身份隔离版）
 *
 * POST /api/upload
 *   Body: multipart/form-data { file: File }
 *   Response: { publicUrl: string, storagePath: string }
 *
 * 隔离路径规则：
 *   {identityType}/{orgId}/{userId}/{timestamp}-{random}.{ext}
 *
 * 校验：
 *   - requireOrgAccess：身份鉴权 + 403 越权拦截
 *   - 文件大小限制：10MB
 *   - 文件类型白名单：pdf, jpg, jpeg, png, gif, doc, docx, xls, xlsx
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOrgAccess } from '@/lib/identity-middleware';
import { uploadFile } from '@/lib/storage';

// 允许的文件类型
const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

// 最大文件大小（10MB）
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    // 1. 身份校验
    const { identity, error } = await requireOrgAccess(request);
    if (error) return error;

    // 2. 解析 multipart form data
    const formData = await request.formData();
    const fileField = formData.get('file') as File | null;

    if (!fileField) {
      return NextResponse.json(
        { error: '缺少文件', code: 'FILE_MISSING' },
        { status: 400 }
      );
    }

    // 3. 文件类型校验
    if (!ALLOWED_TYPES.includes(fileField.type)) {
      return NextResponse.json(
        {
          error: `不支持的文件类型: ${fileField.type}`,
          code: 'FILE_TYPE_NOT_ALLOWED',
          allowedTypes: ALLOWED_TYPES.map(t => t.split('/').pop()),
        },
        { status: 400 }
      );
    }

    // 4. 文件大小校验
    if (fileField.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: '文件大小超过限制（最大 10MB）',
          code: 'FILE_TOO_LARGE',
          maxSize: '10MB',
        },
        { status: 400 }
      );
    }

    // 5. 读取文件内容
    const fileBuffer = await fileField.arrayBuffer();

    // 6. 上传到 Supabase Storage（身份隔离路径）
    const result = await uploadFile(
      fileBuffer,
      fileField.type,
      identity.identityType,
      identity.orgId,
      identity.userId,
      fileField.name
    );

    // 7. 返回结果
    return NextResponse.json({
      publicUrl: result.publicUrl,
      storagePath: result.storagePath,
      fileName: fileField.name,
      fileSize: fileField.size,
      fileType: fileField.type,
    });
  } catch (err) {
    console.error('[Upload API] 上传失败:', err);
    return NextResponse.json(
      { error: '文件上传失败，请重试', code: 'UPLOAD_FAILED' },
      { status: 500 }
    );
  }
}
