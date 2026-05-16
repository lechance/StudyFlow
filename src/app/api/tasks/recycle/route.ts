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

// 永久删除单个回收站任务
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '请先登录'
      }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const db = getDb();

    if (body.taskId) {
      // 永久删除单个任务
      const item = db.prepare('SELECT * FROM recycle_bin WHERE task_id = ? AND user_id = ?').get(body.taskId, user.id) as RecycleBinItem | undefined;
      if (!item) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: '任务不存在'
        }, { status: 404 });
      }
      db.prepare('DELETE FROM tasks WHERE id = ?').run(body.taskId);
      db.prepare('DELETE FROM recycle_bin WHERE task_id = ? AND user_id = ?').run(body.taskId, user.id);
    } else {
      // 清空回收站
      const items = db.prepare('SELECT task_id FROM recycle_bin WHERE user_id = ?').all(user.id) as { task_id: string }[];
      for (const item of items) {
        db.prepare('DELETE FROM tasks WHERE id = ?').run(item.task_id);
      }
      db.prepare('DELETE FROM recycle_bin WHERE user_id = ?').run(user.id);
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      message: body.taskId ? '任务已永久删除' : '回收站已清空'
    });
  } catch (error) {
    console.error('Delete from recycle bin error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: '删除失败'
    }, { status: 500 });
  }
}
