import { NextResponse } from 'next/server';
import { getSessionCookie, deleteSession, initSessionsTable } from '@/lib/auth';
import type { ApiResponse } from '@/lib/types';

const SESSION_COOKIE_NAME = 'study_session';

// 初始化 sessions 表
initSessionsTable();

// 登出
export async function POST() {
  try {
    const sessionId = await getSessionCookie();
    if (sessionId) {
      await deleteSession(sessionId);
    }

    const response = NextResponse.json<ApiResponse>({
      success: true,
      message: '登出成功'
    });
    
    // 清除 cookie
    response.cookies.delete(SESSION_COOKIE_NAME);

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: '登出失败'
    }, { status: 500 });
  }
}
