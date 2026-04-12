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
    // 协议检测逻辑（优先级从高到低）：
    // 1. x-forwarded-proto 头（通过代理时）
    // 2. x-url-scheme 头（某些平台的替代头）
    // 3. request.url 协议
    // 4. origin 头中的协议
    // 5. 如果 host 包含 .dev.coze.site 或 .coze.site，假设是 HTTPS
    const forwardedProto = request.headers.get('x-forwarded-proto');
    const urlScheme = request.headers.get('x-url-scheme');
    const urlProto = request.url.split('://')[0];
    const host = request.headers.get('host') || '';
    const origin = request.headers.get('origin') || '';
    
    // 检测逻辑
    let isHttps = false;
    if (forwardedProto === 'https' || urlScheme === 'https') {
      isHttps = true;
    } else if (urlProto === 'https') {
      isHttps = true;
    } else if (origin.startsWith('https://')) {
      // 如果 origin 是 https，说明外部请求是通过 HTTPS 发送的
      isHttps = true;
    } else if (host.includes('.dev.coze.site') || host.includes('.coze.site')) {
      // 这些域名通常通过 HTTPS 访问
      isHttps = true;
    }
    
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
