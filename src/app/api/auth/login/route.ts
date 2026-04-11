import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyPassword, createSession } from '@/lib/auth';
import type { ApiResponse } from '@/lib/types';
import { cookies } from 'next/headers';

const SESSION_COOKIE_NAME = 'study_session';

// 登录
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '用户名和密码不能为空'
      }, { status: 400 });
    }

    const db = getDb();

    // 查找用户
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
    if (!user) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '用户名或密码错误'
      }, { status: 401 });
    }
    
    // 验证密码
    const isPasswordValid = verifyPassword(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '用户名或密码错误'
      }, { status: 401 });
    }

    // 创建会话
    const sessionId = await createSession(user.id);

    // 创建响应并设置 cookie
    const response = NextResponse.json<ApiResponse>({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        streak_days: user.streak_days,
        total_study_time: user.total_study_time
      },
      message: '登录成功'
    });

    // 设置 session cookie
    // 根据请求协议决定是否使用 Secure 属性
    // HTTPS 请求使用 Secure，HTTP 请求不使用
    const isHttps = request.headers.get('x-forwarded-proto') === 'https' || 
                    request.headers.get('referer')?.startsWith('https://') ||
                    request.url.startsWith('https://');
    
    response.cookies.set(SESSION_COOKIE_NAME, sessionId, {
      httpOnly: true,
      secure: isHttps,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/'
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: '登录失败: ' + (error instanceof Error ? error.message : 'Unknown error')
    }, { status: 500 });
  }
}
