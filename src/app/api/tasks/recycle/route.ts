import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import type { ApiResponse, RecycleBinItem } from '@/lib/types';

// 获取回收站任务
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '请先登录'
      }, { status: 401 });
    }

    const db = getDb();
    const items = db.prepare(`
      SELECT * FROM recycle_bin WHERE user_id = ? ORDER BY deleted_at DESC
    `).all(user.id) as RecycleBinItem[];

    // 解析 task_data
    const tasks = items.map(item => ({
      ...item,
      task: JSON.parse(item.task_data)
    }));

    return NextResponse.json<ApiResponse>({
      success: true,
      data: tasks
    });
  } catch (error) {
    console.error('Get recycle bin error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: '获取回收站失败'
    }, { status: 500 });
  }
}
