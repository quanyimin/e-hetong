/**
 * 文件存储工具 — Supabase Storage 封装
 *
 * 文件隔离路径规则（Phase 3 数据隔离）：
 *   {identityType}/{orgId}/{userId}/{timestamp}-{filename}
 *
 * 示例：
 *   PERSONAL/user_001/user_001/1695000000-合同.pdf
 *   ENTERPRISE/tenant_abc/user_001/1695000000-发票.jpg
 *
 * 跨身份不可访问：个人身份无法访问 ENTERPRISE 路径下的文件
 */

import { supabaseAdmin } from './supabase';

/** 默认存储桶名称 */
const DEFAULT_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || 'contracts';

export interface StorageFile {
  /** 文件公开访问 URL */
  publicUrl: string;
  /** 存储路径（隔离路径） */
  storagePath: string;
}

// ─── 路径生成 ────────────────────────────────────────────────

/**
 * 根据身份上下文生成隔离的文件存储路径
 *
 * @param identityType PERSONAL | ENTERPRISE
 * @param orgId 企业=tenantId，个人=userId
 * @param userId 当前用户ID
 * @param filename 原始文件名（仅保留扩展名）
 * @returns 隔离路径字符串
 */
export function buildStoragePath(
  identityType: string,
  orgId: string,
  userId: string,
  filename: string
): string {
  // 提取扩展名，防止路径注入
  const sanitizedExt = filename.replace(/^.*\.([^.]+)$/, '$1').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  const ext = sanitizedExt || 'bin';
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);

  // 路径：身份类型/组织ID/用户ID/时间戳-随机数.扩展名
  return `${identityType}/${orgId}/${userId}/${timestamp}-${random}.${ext}`;
}

// ─── 文件上传 ────────────────────────────────────────────────

/**
 * 上传文件到 Supabase Storage（身份隔离路径）
 *
 * @param fileBuffer 文件二进制数据
 * @param contentType MIME 类型
 * @param identityType 身份类型
 * @param orgId 组织ID
 * @param userId 用户ID
 * @param filename 原始文件名
 * @param bucket 存储桶名称（默认 contracts）
 * @returns 公开 URL + 存储路径
 */
export async function uploadFile(
  fileBuffer: ArrayBuffer | Blob | Uint8Array,
  contentType: string,
  identityType: string,
  orgId: string,
  userId: string,
  filename: string,
  bucket: string = DEFAULT_BUCKET
): Promise<StorageFile> {
  const storagePath = buildStoragePath(identityType, orgId, userId, filename);

  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(storagePath, fileBuffer, {
      contentType,
      upsert: false,
    });

  if (error) {
    throw new Error(`文件上传失败: ${error.message}`);
  }

  // 生成公开访问 URL
  const { data: urlData } = supabaseAdmin.storage
    .from(bucket)
    .getPublicUrl(storagePath);

  return {
    publicUrl: urlData.publicUrl,
    storagePath,
  };
}

/**
 * 上传 base64 格式的文件到 Supabase Storage
 *
 * @param base64Data data:image/jpeg;base64,/9j/4AAQ... 格式的 base64 字符串
 * @param identityType 身份类型
 * @param orgId 组织ID
 * @param userId 用户ID
 * @param filename 原始文件名
 * @param bucket 存储桶名称
 * @returns 公开 URL + 存储路径
 */
export async function uploadBase64File(
  base64Data: string,
  identityType: string,
  orgId: string,
  userId: string,
  filename: string,
  bucket: string = DEFAULT_BUCKET
): Promise<StorageFile> {
  // 解析 data URL
  const matches = base64Data.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches) {
    throw new Error('无效的 base64 数据 URL');
  }

  const contentType = matches[1];
  const base64Content = matches[2];

  // base64 → Buffer
  const buffer = Buffer.from(base64Content, 'base64');

  return uploadFile(buffer, contentType, identityType, orgId, userId, filename, bucket);
}

// ─── 文件删除 ────────────────────────────────────────────────

/**
 * 删除存储中的文件
 *
 * @param storagePath 存储路径
 * @param bucket 存储桶名称
 */
export async function deleteFile(
  storagePath: string,
  bucket: string = DEFAULT_BUCKET
): Promise<void> {
  const { error } = await supabaseAdmin.storage
    .from(bucket)
    .remove([storagePath]);

  if (error) {
    console.error(`文件删除失败: ${storagePath}`, error.message);
  }
}

/**
 * 批量删除文件
 *
 * @param storagePaths 存储路径数组
 * @param bucket 存储桶名称
 */
export async function deleteFiles(
  storagePaths: string[],
  bucket: string = DEFAULT_BUCKET
): Promise<void> {
  if (storagePaths.length === 0) return;

  const { error } = await supabaseAdmin.storage
    .from(bucket)
    .remove(storagePaths);

  if (error) {
    console.error(`批量文件删除失败:`, error.message);
  }
}

// ─── 文件查询 ────────────────────────────────────────────────

/**
 * 列出某身份组织下的所有文件
 *
 * @param identityType 身份类型
 * @param orgId 组织ID
 * @param bucket 存储桶名称
 * @returns 文件列表
 */
export async function listOrgFiles(
  identityType: string,
  orgId: string,
  bucket: string = DEFAULT_BUCKET
) {
  const prefix = `${identityType}/${orgId}/`;

  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .list(prefix, {
      sortBy: { column: 'created_at', order: 'desc' },
    });

  if (error) {
    console.error(`列出文件失败:`, error.message);
    return [];
  }

  return data.map((file) => ({
    name: file.name,
    publicUrl: supabaseAdmin.storage.from(bucket).getPublicUrl(`${prefix}${file.name}`).data.publicUrl,
    createdAt: file.created_at,
    metadata: file.metadata,
  }));
}
