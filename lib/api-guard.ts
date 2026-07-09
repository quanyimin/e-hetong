import { NextResponse } from 'next/server';

export function unauthorized(message = '未授权') {
  return NextResponse.json({ code: 1, message }, { status: 401 });
}

export function forbidden(message = '权限不足') {
  return NextResponse.json({ code: 1, message }, { status: 403 });
}
