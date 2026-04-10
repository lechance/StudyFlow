import { NextRequest, NextResponse } from 'next/server';
import { getDb, generateId } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import type { ApiResponse, Task } from '@/lib/types';

// 获取单个任务
export async function GET(
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
    const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(id, user.id) as Task | undefined;

    if (!task) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '任务不存在'
      }, { status: 404 });
    }

    // Get subtasks for this task
    const subtasks = db.prepare(`
      SELECT * FROM subtasks 
      WHERE task_id = ? 
      ORDER BY sort_order ASC, created_at ASC
    `).all(id);

    const completedCount = subtasks.filter((s: any) => s.completed === 1).length;
    const totalCount = subtasks.length;
    const progress = totalCount > 0 ? Math.min(100, Math.round((completedCount / totalCount) * 100)) : 0;

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        ...task,
        subtasks,
        subtask_progress: progress,
        subtask_completed: completedCount,
        subtask_total: totalCount
      }
    });
  } catch (error) {
    console.error('Get task error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: '获取任务失败'
    }, { status: 500 });
  }
}

// 更新任务
export async function PUT(
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
    const db = getDb();

    const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(id, user.id) as Task | undefined;
    if (!task) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '任务不存在'
      }, { status: 404 });
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (body.title !== undefined) {
      updates.push('title = ?');
      values.push(body.title);
    }
    if (body.category !== undefined) {
      updates.push('category = ?');
      values.push(body.category);
    }
    if (body.priority !== undefined) {
      updates.push('priority = ?');
      values.push(body.priority);
    }
    if (body.status !== undefined) {
      updates.push('status = ?');
      values.push(body.status);
      if (body.status === 'completed') {
        updates.push('completed_at = datetime(\'now\')');
      }
    }
    if (body.deadline !== undefined) {
      updates.push('deadline = ?');
      values.push(body.deadline);
    }
    if (body.plan_date !== undefined) {
      updates.push('plan_date = ?');
      values.push(body.plan_date);
    }
    if (body.estimated_time !== undefined) {
      updates.push('estimated_time = ?');
      values.push(body.estimated_time);
    }

    updates.push('updated_at = datetime(\'now\')');
    values.push(id, user.id);

    db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`).run(...values);

    const updatedTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Task;

    return NextResponse.json<ApiResponse>({
      success: true,
      data: updatedTask,
      message: '任务更新成功'
    });
  } catch (error) {
    console.error('Update task error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: '更新任务失败'
    }, { status: 500 });
  }
}

// 删除任务（软删除到回收站）
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

    const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(id, user.id) as Task | undefined;
    if (!task) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '任务不存在'
      }, { status: 404 });
    }

    // 软删除：将任务移入回收站
    db.prepare('UPDATE tasks SET is_deleted = 1 WHERE id = ?').run(id);

    // 保存到回收站记录
    db.prepare(`
      INSERT INTO recycle_bin (id, user_id, task_id, task_data)
      VALUES (?, ?, ?, ?)
    `).run(generateId(), user.id, id, JSON.stringify(task));

    return NextResponse.json<ApiResponse>({
      success: true,
      message: '任务已移入回收站'
    });
  } catch (error) {
    console.error('Delete task error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: '删除任务失败'
    }, { status: 500 });
  }
}
