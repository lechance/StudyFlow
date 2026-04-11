import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import type { ApiResponse } from '@/lib/types';

const SESSION_COOKIE_NAME = 'study_session';

// 登出
export async function POST(request: NextRequest) {
  try {
    // 从请求头中获取 session cookie
    const cookieHeader = request.headers.get('cookie') || '';
    const cookies = Object.fromEntries(
      cookieHeader.split(';').map(c => {
        const [key, ...val] = c.trim().split('=');
        return [key, val.join('=')];
      })
    );
    const sessionId = cookies[SESSION_COOKIE_NAME];
    
    if (sessionId) {
      // 删除会话
      const db = getDb();
      db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
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
