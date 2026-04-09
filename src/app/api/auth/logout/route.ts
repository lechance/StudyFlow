import { NextResponse } from 'next/server';
import { getSessionCookie, deleteSession, clearSessionCookie, initSessionsTable } from '@/lib/auth';
import type { ApiResponse } from '@/lib/types';

// 初始化 sessions 表
initSessionsTable();

// 登出
export async function POST() {
  try {
    const sessionId = await getSessionCookie();
    if (sessionId) {
      await deleteSession(sessionId);
    }
    await clearSessionCookie();

    return NextResponse.json<ApiResponse>({
      success: true,
      message: '登出成功'
    });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: '登出失败'
    }, { status: 500 });
  }
}
