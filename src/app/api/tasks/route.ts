import { NextRequest, NextResponse } from 'next/server';
import { getDb, generateId } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import type { ApiResponse, Task } from '@/lib/types';

// 获取所有任务
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '请先登录'
      }, { status: 401 });
    }

    const db = getDb();
    const { searchParams } = new URL(request.url);
    const includeDeleted = searchParams.get('includeDeleted') === 'true';

    let query = 'SELECT * FROM tasks WHERE user_id = ?';
    if (!includeDeleted) {
      query += ' AND is_deleted = 0';
    }
    query += ' ORDER BY CASE priority WHEN \'high\' THEN 1 WHEN \'medium\' THEN 2 WHEN \'low\' THEN 3 END, deadline ASC';

    const tasks = db.prepare(query).all(user.id) as Task[];

    return NextResponse.json<ApiResponse>({
      success: true,
      data: tasks
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: '获取任务列表失败'
    }, { status: 500 });
  }
}

// 创建任务
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '请先登录'
      }, { status: 401 });
    }

    const body = await request.json();
    const { title, category, priority, deadline, estimated_time } = body;

    if (!title) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '任务名称不能为空'
      }, { status: 400 });
    }

    const db = getDb();
    const taskId = generateId();

    db.prepare(`
      INSERT INTO tasks (id, user_id, title, category, priority, deadline, estimated_time, status, is_deleted)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 0)
    `).run(taskId, user.id, title, category || '其他', priority || 'medium', deadline || null, estimated_time || null);

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId) as Task;

    return NextResponse.json<ApiResponse>({
      success: true,
      data: task,
      message: '任务创建成功'
    });
  } catch (error) {
    console.error('Create task error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: '创建任务失败'
    }, { status: 500 });
  }
}

// 批量删除已完成任务
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '请先登录'
      }, { status: 401 });
    }

    const db = getDb();
    const body = await request.json().catch(() => ({}));
    
    // 如果传入了 ids，则只删除指定任务；否则删除所有已完成任务
    if (body.ids && Array.isArray(body.ids)) {
      const placeholders = body.ids.map(() => '?').join(',');
      db.prepare(`DELETE FROM tasks WHERE id IN (${placeholders}) AND user_id = ?`).run(...body.ids, user.id);
    } else {
      db.prepare('DELETE FROM tasks WHERE user_id = ? AND status = ? AND is_deleted = 0').run(user.id, 'completed');
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      message: '任务已清空'
    });
  } catch (error) {
    console.error('Clear tasks error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: '清空任务失败'
    }, { status: 500 });
  }
}
