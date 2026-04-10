import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyPassword, createSession, setSessionCookie, initSessionsTable } from '@/lib/auth';
import type { ApiResponse } from '@/lib/types';

// 初始化 sessions 表
try {
  initSessionsTable();
} catch (error) {
  console.error('Failed to initialize sessions table:', error);
}

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

    console.log('Login attempt for username:', username);

    const db = getDb();
    console.log('Database connection established');

    // 查找用户
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
    if (!user) {
      console.log('User not found:', username);
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '用户名或密码错误'
      }, { status: 401 });
    }
    
    console.log('User found:', user.id, user.username);

    // 验证密码
    const isPasswordValid = verifyPassword(password, user.password);
    console.log('Password verification result:', isPasswordValid);
    
    if (!isPasswordValid) {
      console.log('Password verification failed for user:', username);
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '用户名或密码错误'
      }, { status: 401 });
    }

    console.log('Creating session for user:', user.id);
    
    // 创建会话
    const sessionId = await createSession(user.id);
    console.log('Session created:', sessionId);
    
    await setSessionCookie(sessionId);
    console.log('Session cookie set');

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
      error: '登录失败: ' + (error instanceof Error ? error.message : 'Unknown error')
    }, { status: 500 });
  }
}
