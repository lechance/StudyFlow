import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import type { ApiResponse, User } from '@/lib/types';

// 获取所有用户（管理员）
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '请先登录'
      }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '权限不足'
      }, { status: 403 });
    }

    const db = getDb();
    const users = db.prepare('SELECT id, username, email, role, streak_days, total_study_time, created_at FROM users ORDER BY created_at DESC').all() as User[];

    return NextResponse.json<ApiResponse>({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: '获取用户列表失败'
    }, { status: 500 });
  }
}
