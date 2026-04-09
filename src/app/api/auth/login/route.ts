import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyPassword, createSession, setSessionCookie, initSessionsTable } from '@/lib/auth';
import type { ApiResponse } from '@/lib/types';

// 初始化 sessions 表
initSessionsTable();

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
    if (!verifyPassword(password, user.password)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '用户名或密码错误'
      }, { status: 401 });
    }

    // 创建会话
    const sessionId = await createSession(user.id);
    await setSessionCookie(sessionId);

    return NextResponse.json<ApiResponse>({
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
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: '登录失败'
    }, { status: 500 });
  }
}
