import { NextRequest, NextResponse } from 'next/server';
import { getDb, generateId } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import type { ApiResponse } from '@/lib/types';

// 恢复任务
export async function POST(
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

    const { id } = await params;
    const body = await request.json();
    const { taskId } = body;

    if (!taskId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '任务ID不能为空'
      }, { status: 400 });
    }

    const db = getDb();

    // 从回收站恢复
    db.prepare('UPDATE tasks SET is_deleted = 0 WHERE id = ? AND user_id = ?').run(taskId, user.id);
    db.prepare('DELETE FROM recycle_bin WHERE task_id = ? AND user_id = ?').run(taskId, user.id);

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: task,
      message: '任务已恢复'
    });
  } catch (error) {
    console.error('Restore task error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: '恢复任务失败'
    }, { status: 500 });
  }
}

// 永久删除单个任务
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

    const { id } = await params;
    const db = getDb();

    // 从回收站获取任务信息
    const item = db.prepare('SELECT * FROM recycle_bin WHERE id = ? AND user_id = ?').get(id, user.id) as { task_id: string } | undefined;
    if (!item) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '回收站记录不存在'
      }, { status: 404 });
    }

    // 永久删除任务
    db.prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?').run(item.task_id, user.id);
    
    // 删除回收站记录
    db.prepare('DELETE FROM recycle_bin WHERE id = ?').run(id);

    return NextResponse.json<ApiResponse>({
      success: true,
      message: '任务已永久删除'
    });
  } catch (error) {
    console.error('Permanent delete error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: '永久删除失败'
    }, { status: 500 });
  }
}

// 清空回收站
export async function PUT() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '请先登录'
      }, { status: 401 });
    }

    const db = getDb();

    // 获取回收站中的任务ID
    const items = db.prepare('SELECT task_id FROM recycle_bin WHERE user_id = ?').all(user.id) as { task_id: string }[];
    
    // 从 tasks 表彻底删除
    for (const item of items) {
      db.prepare('DELETE FROM tasks WHERE id = ?').run(item.task_id);
    }

    // 清空回收站记录
    db.prepare('DELETE FROM recycle_bin WHERE user_id = ?').run(user.id);

    return NextResponse.json<ApiResponse>({
      success: true,
      message: '回收站已清空'
    });
  } catch (error) {
    console.error('Clear recycle bin error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: '清空回收站失败'
    }, { status: 500 });
  }
}
