/**
 * ===========================================
 * 文件文本提取工具
 * ===========================================
 * 支持从 PDF、TXT、图片中提取文本内容
 * 
 * 使用方式：
 *   const text = await extractTextFromFile(file);
 *   // 然后将 text 传给 AI 解析
 */

/**
 * 从文件中提取文本内容
 * @param file 用户选择的文件
 * @returns 提取的文本内容
 */
export async function extractTextFromFile(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  try {
    switch (ext) {
      case 'txt':
        return await readTextFile(file);
      case 'pdf':
        return await extractPdfText(file);
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'bmp':
      case 'webp':
        return await extractImageText(file);
      case 'docx':
      case 'doc':
        // DOCX 解析较复杂，返回文件名提示
        return `[Word文档] ${file.name}。请将文档内容复制粘贴到文本框中以获得更准确的解析。`;
      default:
        return `[${ext.toUpperCase()}] ${file.name}`;
    }
  } catch (error) {
    console.error(`[文件提取] ${file.name} 失败:`, error);
    return `[${file.name}] 文件内容提取失败，请确认文件格式正确。`;
  }
}

/** 读取纯文本文件 */
async function readTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsText(file);
  });
}

/** 从 PDF 提取文本 */
async function extractPdfText(file: File): Promise<string> {
  try {
    const pdfjsLib = await import('pdfjs-dist');
    
    // 设置 worker 路径
    pdfjsLib.GlobalWorkerOptions.workerSrc = '';
    
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    for (let i = 1; i <= Math.min(pdf.numPages, 20); i++) {  // 最多20页
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n';
    }
    
    return fullText.trim() || `[PDF文件] ${file.name}，未能提取到文本内容。`;
  } catch (error) {
    console.error('[PDF提取] 失败:', error);
    return `[PDF文件] ${file.name}`;
  }
}

/** 从图片提取文字（OCR） */
async function extractImageText(file: File): Promise<string> {
  try {
    const Tesseract = await import('tesseract.js');
    const { data } = await Tesseract.recognize(file, 'chi_sim+eng', {
      logger: (m: any) => {
        if (m.status === 'recognizing text') {
          console.log(`[OCR] ${Math.round(m.progress * 100)}%`);
        }
      },
    });
    
    return data.text.trim() || `[图片文件] ${file.name}，未识别到文字内容。`;
  } catch (error) {
    console.error('[OCR] 失败:', error);
    return `[图片文件] ${file.name}，OCR识别失败。`;
  }
}

/**
 * 获取文件的可读摘要（文件信息，不提取全文）
 * 用于快速显示文件基本信息
 */
export function getFileSummary(file: File): string {
  const ext = file.name.split('.').pop()?.toUpperCase() || '未知';
  const size = file.size > 1024 * 1024
    ? `${(file.size / 1024 / 1024).toFixed(1)}MB`
    : `${(file.size / 1024).toFixed(0)}KB`;
  return `${ext} · ${size}`;
}
