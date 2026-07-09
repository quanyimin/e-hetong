/**
 * ===========================================
 * 文件预览工具
 * ===========================================
 * 支持：图片、PDF、DOCX、TXT 的浏览器内预览
 *
 * 市面上主流方案：
 * - 图片: 原生 <img>
 * - PDF:  浏览器原生 <iframe> / pdf.js
 * - DOCX: mammoth.js → HTML
 * - TXT:  原生 <pre>
 * - 其他: 显示文件信息 + 下载按钮
 */

/**
 * 判断文件是否可以直接在浏览器中预览
 */
export function canPreview(ext: string): boolean {
  const previewable = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'pdf', 'txt', 'docx'];
  return previewable.includes(ext.toLowerCase());
}

/**
 * 获取预览类型
 */
export function getPreviewType(ext: string): 'image' | 'pdf' | 'docx' | 'text' | 'none' {
  const e = ext.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(e)) return 'image';
  if (e === 'pdf') return 'pdf';
  if (e === 'docx') return 'docx';
  if (e === 'txt') return 'text';
  return 'none';
}

/**
 * 使用 mammoth.js 将 DOCX 转换为 HTML
 */
export async function docxToHtml(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const mammoth = await import('mammoth');
    const result = await mammoth.default.convertToHtml({ arrayBuffer });
    return result.value;
  } catch (error) {
    console.error('[DOCX预览] 转换失败:', error);
    return '<p style="color:#999">DOCX 文件预览失败</p>';
  }
}

/**
 * 生成 PDF 预览 URL（使用 Blob）
 */
export function getPdfBlobUrl(arrayBuffer: ArrayBuffer): string {
  const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
  return URL.createObjectURL(blob);
}

/**
 * 读取文件为 ArrayBuffer
 */
export function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsArrayBuffer(file);
  });
}
