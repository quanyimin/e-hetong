import { NextRequest, NextResponse } from 'next/server';

// 根据证照类型返回模拟OCR识别结果
function getMockResult(type: string) {
  const now = new Date();
  const nextYear = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());

  const mockData: Record<string, any> = {
    ID_CARD: {
      name: '张三',
      number: '110101199001011234',
      authority: '北京市公安局某某分局',
      issueDate: '2018-06-01',
      expireDate: '2028-06-01',
    },
    GRADUATION: {
      name: '张三·北京大学本科毕业证',
      number: 'BJ10001',
      authority: '北京大学',
      issueDate: '2012-07-01',
      expireDate: '',
    },
    HONOR: {
      name: '张三·优秀员工荣誉证书',
      number: 'RY2024-001',
      authority: '某某科技有限公司',
      issueDate: '2024-01-15',
      expireDate: '',
    },
    DRIVER_LICENSE: {
      name: '张三·机动车驾驶证',
      number: '110101199001011234',
      authority: '北京市公安局交通管理局',
      issueDate: '2020-03-15',
      expireDate: '2026-03-15',
    },
    PROFESSIONAL: {
      name: '张三·法律职业资格证书',
      number: 'A2020123456',
      authority: '中华人民共和国司法部',
      issueDate: '2020-09-01',
      expireDate: '',
    },
    OTHER: {
      name: '张三·其他证照',
      number: 'QT2024-001',
      authority: '某某机构',
      issueDate: '2023-01-01',
      expireDate: nextYear.toISOString().split('T')[0],
    },
  };

  return mockData[type] || mockData.OTHER;
}

// POST /api/ocr - OCR识别
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageBase64, type } = body;

    if (!imageBase64) {
      return NextResponse.json({ success: false, error: '缺少图片数据' }, { status: 400 });
    }

    // 模拟OCR处理延迟
    await new Promise(resolve => setTimeout(resolve, 1500));

    const result = getMockResult(type || 'OTHER');

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error in OCR:', error);
    return NextResponse.json({ success: false, error: 'OCR识别失败' }, { status: 500 });
  }
}
