import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 当前阶段：开发/演示模式，放行所有页面
// TODO: 正式接入 Supabase Auth 后恢复权限校验

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 放行静态资源和 API
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/static/') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // 【演示模式】放行所有页面，不拦截
  // 后续接入 Supabase Auth 后取消注释以下代码
  /*
  const authToken = request.cookies.get('sb-access-token')?.value;
  const isLoggedIn = !!authToken;
  const PUBLIC_ROUTES = ['/', '/login', '/register', '/pricing', '/403'];

  if (PUBLIC_ROUTES.includes(pathname)) return NextResponse.next();

  if (!isLoggedIn && (pathname.startsWith('/dashboard') || pathname.startsWith('/admin'))) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (isLoggedIn && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (pathname.startsWith('/admin')) {
    const userRole = request.headers.get('x-user-role') || 'user';
    if (userRole !== 'admin') {
      return NextResponse.redirect(new URL('/403', request.url));
    }
  }
  */

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
