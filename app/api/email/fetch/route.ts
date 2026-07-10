import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { ImapFlow, MessageStructureObject } from 'imapflow';

// ============================================================
// 附件文本提取（服务端版本）
// 支持 PDF / 图片(OCR) / DOCX / TXT
// ============================================================
async function extractTextFromAttachment(
  filename: string,
  buffer: Buffer
): Promise<string> {
  const ext = filename.split('.').pop()?.toLowerCase() || '';

  try {
    switch (ext) {
      case 'txt': {
        return buffer.toString('utf-8');
      }
      case 'pdf': {
        const pdfjsLib = await import('pdfjs-dist');
        const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
        let text = '';
        const maxPages = Math.min(pdf.numPages, 20);
        for (let i = 1; i <= maxPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          text += content.items.map((item: any) => item.str).join(' ') + '\n';
        }
        return text.trim() || `[PDF] ${filename} （未提取到文字）`;
      }
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'bmp':
      case 'webp': {
        const Tesseract = await import('tesseract.js');
        const { data } = await Tesseract.recognize(buffer, 'chi_sim+eng', {
          logger: () => {},
        });
        return data.text.trim() || `[图片] ${filename} （未识别到文字）`;
      }
      case 'docx': {
        const mammoth = await import('mammoth');
        const result = await mammoth.extractRawText({ buffer });
        return result.value.trim() || `[DOCX] ${filename}`;
      }
      default:
        return `[${ext.toUpperCase()}] ${filename}`;
    }
  } catch (error) {
    console.error(`[附件提取] ${filename} 失败:`, error);
    return `[${filename}] 文本提取失败`;
  }
}

// ============================================================
// 遍历 bodyStructure 收集所有附件叶节点
// ============================================================
interface AttachmentPart {
  part: string;
  filename: string;
  contentType: string;
  size: number;
}

function collectAttachments(
  node: MessageStructureObject
): AttachmentPart[] {
  const results: AttachmentPart[] = [];

  if (node.childNodes && node.childNodes.length > 0) {
    for (const child of node.childNodes) {
      results.push(...collectAttachments(child));
    }
  } else if (node.type && !node.type.startsWith('multipart/')) {
    // 从 Content-Type 的 name 参数或 Content-Disposition 的 filename 参数获取文件名
    const params = node.parameters || {};
    const dispParams = node.dispositionParameters || {};
    const filename = params['name'] || dispParams['filename'] || '';

    if (filename) {
      results.push({
        part: node.part || '',
        filename,
        contentType: node.type,
        size: node.size || 0,
      });
    }
  }

  return results;
}

// ============================================================
// 查找 text/plain 正文部分的 part ID
// ============================================================
function findTextBodyPart(node: MessageStructureObject): string | null {
  if (node.childNodes && node.childNodes.length > 0) {
    for (const child of node.childNodes) {
      const found = findTextBodyPart(child);
      if (found) return found;
    }
  } else if (node.type === 'text/plain' && node.part) {
    // 没有 filename 的 text/plain 才是邮件正文（而非附件）
    const params = node.parameters || {};
    const dispParams = node.dispositionParameters || {};
    const hasFilename = !!(params['name'] || dispParams['filename']);
    if (!hasFilename) {
      return node.part;
    }
  }
  return null;
}

// ============================================================
// POST /api/email/fetch — 真实 IMAP 抓取
// ============================================================
export async function POST(request: NextRequest) {
  let emailConfig: any = null;

  try {
    const userId = request.cookies.get('user_id')?.value;
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const personalSpace = await prisma.personalSpace.findUnique({
      where: { userId },
    });
    if (!personalSpace) {
      return NextResponse.json({ error: '个人空间不存在' }, { status: 404 });
    }

    const config = JSON.parse(personalSpace.customKeywords || '{}');
    emailConfig = config.emailConfig;
    if (!emailConfig || !emailConfig.email || !emailConfig.password) {
      return NextResponse.json({ error: '请先配置邮箱' }, { status: 400 });
    }

    // ========================================
    // 1. 连接 IMAP 服务器
    // ========================================
    const client = new ImapFlow({
      host: emailConfig.imapServer || 'imap.qq.com',
      port: Number(emailConfig.imapPort) || 993,
      secure: true,
      auth: {
        user: emailConfig.email,
        pass: emailConfig.password,
      },
      logger: false,
    });

    await client.connect();

    // ========================================
    // 2. 锁定 INBOX，获取最近 20 封邮件
    // ========================================
    const lock = await client.getMailboxLock('INBOX');
    const emails: any[] = [];

    try {
      const mailbox = client.mailbox;
      const total = mailbox && typeof mailbox === 'object' ? mailbox.exists : 0;
      const start = Math.max(1, total - 19);
      const range = `${start}:*`;

      for await (const msg of client.fetch(range, {
        uid: true,
        envelope: true,
        bodyStructure: true,
        internalDate: true,
        size: true,
      })) {
        if (!msg.envelope) continue;

        const subject = msg.envelope.subject || '(无主题)';
        const fromAddr =
          msg.envelope.from && msg.envelope.from[0]
            ? `${msg.envelope.from[0].name || ''} <${msg.envelope.from[0].address || ''}>`.trim()
            : '未知发件人';
        const date = msg.envelope.date || msg.internalDate || new Date();
        const messageId = msg.envelope.messageId || `msg-${msg.uid}`;

        // ---- 收集附件信息 ----
        const attachmentParts: AttachmentPart[] = msg.bodyStructure
          ? collectAttachments(msg.bodyStructure)
          : [];

        // ---- 下载邮件正文（text/plain） ----
        let textBody = '';
        if (msg.bodyStructure) {
          const textPartId = findTextBodyPart(msg.bodyStructure);
          if (textPartId) {
            try {
              const dl = await client.download(String(msg.uid), textPartId, {
                uid: true,
                maxBytes: 1 * 1024 * 1024, // 最大 1MB
              });
              const chunks: Buffer[] = [];
              for await (const chunk of dl.content) {
                chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
              }
              textBody = Buffer.concat(chunks).toString('utf-8').trim();
            } catch (e) {
              console.error(`[正文下载] message ${msg.uid} text part 失败:`, e);
            }
          }
        }

        // ---- 下载附件并提取文字 ----
        let ocrText = textBody;
        const attachments: any[] = [];

        for (const att of attachmentParts) {
          try {
            const dl = await client.download(String(msg.uid), att.part, {
              uid: true,
              maxBytes: 10 * 1024 * 1024, // 最大 10MB
            });
            const chunks: Buffer[] = [];
            for await (const chunk of dl.content) {
              chunks.push(
                Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
              );
            }
            const fileBuffer = Buffer.concat(chunks);

            // 提取附件文字
            const extractedText = await extractTextFromAttachment(
              att.filename,
              fileBuffer
            );
            ocrText += '\n\n--- 附件: ' + att.filename + ' ---\n' + extractedText;

            attachments.push({
              filename: att.filename,
              contentType: att.contentType,
              size: att.size || fileBuffer.length,
            });
          } catch (e) {
            console.error(
              `[附件下载] message ${msg.uid} part ${att.part} 失败:`,
              e
            );
            attachments.push({
              filename: att.filename,
              contentType: att.contentType,
              size: att.size || 0,
              error: '下载失败',
            });
          }
        }

        // ---- 保存 Reminder 记录 ----
        const reminder = await prisma.reminder.create({
          data: {
            userId,
            remindType: 'EMAIL_IMPORT',
            remindAt: new Date(),
            title: subject,
            message: JSON.stringify({
              messageId,
              from: fromAddr,
              date: date instanceof Date ? date.toISOString() : String(date),
              attachments: attachments.map((a) => ({
                filename: a.filename,
                contentType: a.contentType,
                size: a.size,
              })),
              ocrText: ocrText.length > 50000 ? ocrText.slice(0, 50000) : ocrText,
            }),
            sendStatus: 'sent',
            sentAt: new Date(),
          },
        });

        // ---- 组装返回数据 ----
        emails.push({
          reminderId: reminder.id,
          messageId,
          subject,
          from: fromAddr,
          date: date instanceof Date ? date.toISOString() : String(date),
          textBody,
          ocrText: ocrText.length > 50000 ? ocrText.slice(0, 50000) : ocrText,
          attachments,
        });
      }
    } finally {
      lock.release();
      await client.logout();
    }

    return NextResponse.json({
      success: true,
      emails,
      total: emails.length,
    });
  } catch (error: any) {
    console.error('[IMAP抓取] 失败:', error);

    // 区分认证失败和网络错误
    if (error.code === 'AUTHENTICATIONFAILED' || error.authenticationFailed) {
      return NextResponse.json(
        { error: '邮箱认证失败，请检查邮箱地址和授权码是否正确' },
        { status: 401 }
      );
    }
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return NextResponse.json(
        { error: `无法连接 IMAP 服务器 ${emailConfig?.imapServer || ''}，请检查服务器地址和端口` },
        { status: 502 }
      );
    }

    return NextResponse.json({ error: '邮件抓取失败: ' + (error.message || '未知错误') }, { status: 500 });
  }
}

// ============================================================
// GET /api/email/fetch — 获取导入历史
// ============================================================
export async function GET(request: NextRequest) {
  try {
    const userId = request.cookies.get('user_id')?.value;
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const imports = await prisma.reminder.findMany({
      where: {
        userId,
        remindType: 'EMAIL_IMPORT',
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return NextResponse.json({ imports, total: imports.length });
  } catch (error) {
    console.error('Error fetching import history:', error);
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}
