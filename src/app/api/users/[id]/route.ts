import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import type { ApiResponse } from '@/lib/types';

// 删除用户（管理员）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const db = getDb();

    // 不允许删除自己
    if (id === user.id) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '不能删除自己'
      }, { status: 400 });
    }

    // 删除用户的所有数据
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id);
    db.prepare('DELETE FROM tasks WHERE user_id = ?').run(id);
    db.prepare('DELETE FROM study_records WHERE user_id = ?').run(id);
    db.prepare('DELETE FROM daily_plans WHERE user_id = ?').run(id);
    db.prepare('DELETE FROM recycle_bin WHERE user_id = ?').run(id);
    db.prepare('DELETE FROM pomodoro_settings WHERE user_id = ?').run(id);
    db.prepare('DELETE FROM users WHERE id = ?').run(id);

    return NextResponse.json<ApiResponse>({
      success: true,
      message: '用户已删除'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: '删除用户失败'
    }, { status: 500 });
  }
}
