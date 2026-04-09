import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { initSessionsTable } from '@/lib/auth';
import type { ApiResponse } from '@/lib/types';

// 初始化 sessions 表
initSessionsTable();

// 获取当前用户
export async function GET() {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '未登录'
      }, { status: 401 });
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        streak_days: user.streak_days,
        total_study_time: user.total_study_time
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: '获取用户信息失败'
    }, { status: 500 });
  }
}
