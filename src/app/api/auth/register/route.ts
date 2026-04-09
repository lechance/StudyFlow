import { NextRequest, NextResponse } from 'next/server';
import { getDb, generateId } from '@/lib/db';
import { hashPassword, createSession, setSessionCookie, initSessionsTable } from '@/lib/auth';
import type { ApiResponse } from '@/lib/types';

// 初始化 sessions 表
initSessionsTable();

// 注册
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password, email } = body;

    if (!username || !password) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '用户名和密码不能为空'
      }, { status: 400 });
    }

    const db = getDb();

    // 检查用户是否已存在
    const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existingUser) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '用户名已存在'
      }, { status: 400 });
    }

    const userId = generateId();
    const hashedPassword = hashPassword(password);

    // 创建用户
    db.prepare(`
      INSERT INTO users (id, username, password, email, role, streak_days, total_study_time)
      VALUES (?, ?, ?, ?, 'user', 0, 0)
    `).run(userId, username, hashedPassword, email || null);

    // 创建默认番茄钟设置
    db.prepare(`
      INSERT INTO pomodoro_settings (id, user_id, focus_duration, break_duration, long_break_duration, sessions_before_long_break)
      VALUES (?, ?, 25, 5, 15, 4)
    `).run(generateId(), userId);

    // 创建会话
    const sessionId = await createSession(userId);
    await setSessionCookie(sessionId);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        id: userId,
        username,
        email,
        role: 'user'
      },
      message: '注册成功'
    });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: '注册失败'
    }, { status: 500 });
  }
}
