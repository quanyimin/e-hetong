import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { account, password } = await request.json();

    if (!account || !password) {
      return NextResponse.json({ success: false, error: '请输入账号和密码' });
    }

    const result = await authenticate(account, password);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error });
    }

    return NextResponse.json({ success: true, user: result.user });
  } catch (error) {
    return NextResponse.json({ success: false, error: '服务器错误' });
  }
}
