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
    const planDate = searchParams.get('planDate');
    const planDateRange = searchParams.get('planDateRange'); // 'today' | 'week' | 'all'

    let query = 'SELECT * FROM tasks WHERE user_id = ?';
    const params: any[] = [user.id];

    if (!includeDeleted) {
      query += ' AND is_deleted = 0';
    }

    // 按计划日期筛选
    if (planDate) {
      query += ' AND plan_date = ?';
      params.push(planDate);
    } else if (planDateRange === 'today') {
      const today = new Date().toISOString().split('T')[0];
      query += ' AND plan_date = ?';
      params.push(today);
    } else if (planDateRange === 'week') {
      const today = new Date();
      const weekEnd = new Date(today);
      weekEnd.setDate(today.getDate() + 7);
      const todayStr = today.toISOString().split('T')[0];
      const weekEndStr = weekEnd.toISOString().split('T')[0];
      query += ' AND plan_date >= ? AND plan_date <= ?';
      params.push(todayStr, weekEndStr);
    }

    query += ' ORDER BY CASE priority WHEN \'high\' THEN 1 WHEN \'medium\' THEN 2 WHEN \'low\' THEN 3 END, plan_date ASC, deadline ASC';

    const tasks = db.prepare(query).all(...params) as Task[];

    // Batch fetch subtasks to avoid N+1 queries
    const taskIds = tasks.map(t => t.id);
    let subtasksMap: Record<string, any[]> = {};
    
    if (taskIds.length > 0) {
      const placeholders = taskIds.map(() => '?').join(',');
      const allSubtasks = db.prepare(`
        SELECT * FROM subtasks 
        WHERE task_id IN (${placeholders})
        ORDER BY sort_order ASC, created_at ASC
      `).all(...taskIds) as any[];
      
      // Group subtasks by task_id
      subtasksMap = allSubtasks.reduce((acc, subtask) => {
        if (!acc[subtask.task_id]) {
          acc[subtask.task_id] = [];
        }
        acc[subtask.task_id].push(subtask);
        return acc;
      }, {} as Record<string, any[]>);
    }

    // Calculate progress for each task
    const tasksWithProgress = tasks.map(task => {
      const subtasks = subtasksMap[task.id] || [];
      const completedCount = subtasks.filter((s: any) => s.completed === 1).length;
      const totalCount = subtasks.length;
      const progress = totalCount > 0 ? Math.min(100, Math.round((completedCount / totalCount) * 100)) : 0;
      
      return {
        ...task,
        subtasks,
        subtask_progress: progress,
        subtask_completed: completedCount,
        subtask_total: totalCount
      };
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      data: tasksWithProgress
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
    const { title, category, priority, deadline, plan_date, estimated_time } = body;

    if (!title) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '任务名称不能为空'
      }, { status: 400 });
    }

    const db = getDb();
    const taskId = generateId();

    db.prepare(`
      INSERT INTO tasks (id, user_id, title, category, priority, deadline, plan_date, estimated_time, status, is_deleted)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0)
    `).run(taskId, user.id, title, category || '其他', priority || 'medium', deadline || null, plan_date || null, estimated_time || null);

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
