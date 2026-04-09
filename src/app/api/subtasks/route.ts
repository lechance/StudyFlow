import { NextRequest, NextResponse } from 'next/server';
import { getDb, generateId } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// GET /api/subtasks - Get subtasks for a task
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  const taskId = request.nextUrl.searchParams.get('taskId');
  if (!taskId) {
    return NextResponse.json({ error: '任务ID不能为空' }, { status: 400 });
  }

  try {
    const db = getDb();
    const subtasks = db.prepare(`
      SELECT * FROM subtasks 
      WHERE task_id = ? AND user_id = ?
      ORDER BY sort_order ASC, created_at ASC
    `).all(taskId, user.id);

    return NextResponse.json({ success: true, data: subtasks });
  } catch (error) {
    console.error('获取子任务失败:', error);
    return NextResponse.json({ error: '获取子任务失败' }, { status: 500 });
  }
}

// POST /api/subtasks - Create a subtask
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { taskId, title, sortOrder } = body;

    if (!taskId || !title) {
      return NextResponse.json({ error: '任务ID和标题不能为空' }, { status: 400 });
    }

    const db = getDb();
    const id = generateId();
    
    db.prepare(`
      INSERT INTO subtasks (id, task_id, user_id, title, sort_order)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, taskId, user.id, title, sortOrder || 0);

    const subtask = db.prepare('SELECT * FROM subtasks WHERE id = ?').get(id);

    return NextResponse.json({ success: true, data: subtask, message: '子任务创建成功' });
  } catch (error) {
    console.error('创建子任务失败:', error);
    return NextResponse.json({ error: '创建子任务失败' }, { status: 500 });
  }
}

// PUT /api/subtasks - Update subtask completion
export async function PUT(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, completed, title, sortOrder } = body;

    if (!id) {
      return NextResponse.json({ error: '子任务ID不能为空' }, { status: 400 });
    }

    const db = getDb();
    
    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];
    
    if (completed !== undefined) {
      updates.push('completed = ?');
      values.push(completed ? 1 : 0);
    }
    if (title !== undefined) {
      updates.push('title = ?');
      values.push(title);
    }
    if (sortOrder !== undefined) {
      updates.push('sort_order = ?');
      values.push(sortOrder);
    }
    
    updates.push("updated_at = datetime('now')");
    values.push(id, user.id);

    db.prepare(`
      UPDATE subtasks SET ${updates.join(', ')}
      WHERE id = ? AND user_id = ?
    `).run(...values);

    const subtask = db.prepare('SELECT * FROM subtasks WHERE id = ?').get(id);

    return NextResponse.json({ success: true, data: subtask, message: '子任务更新成功' });
  } catch (error) {
    console.error('更新子任务失败:', error);
    return NextResponse.json({ error: '更新子任务失败' }, { status: 500 });
  }
}

// DELETE /api/subtasks - Delete a subtask
export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  const id = request.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: '子任务ID不能为空' }, { status: 400 });
  }

  try {
    const db = getDb();
    db.prepare('DELETE FROM subtasks WHERE id = ? AND user_id = ?').run(id, user.id);

    return NextResponse.json({ success: true, message: '子任务已删除' });
  } catch (error) {
    console.error('删除子任务失败:', error);
    return NextResponse.json({ error: '删除子任务失败' }, { status: 500 });
  }
}
