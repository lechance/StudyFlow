import { NextRequest, NextResponse } from 'next/server';
import { getDb, generateId } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import type { ApiResponse } from '@/lib/types';
import { getLatestBackupFromS3, listBackupsFromS3, checkStorageAvailable } from '@/lib/storage';

// 从 S3 恢复任务
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '请先登录'
      }, { status: 401 });
    }

    // 检查 S3 是否可用
    const isAvailable = await checkStorageAvailable(user.id);
    if (!isAvailable) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'S3 存储未配置或不可用'
      }, { status: 400 });
    }

    // 获取最新备份
    const result = await getLatestBackupFromS3(user.id);
    if (!result.success || !result.data) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: result.error || '暂无备份数据'
      }, { status: 404 });
    }

    const backupData = result.data;
    const db = getDb();

    // 获取当前最大ID用于避免冲突
    const existingTasks = db.prepare('SELECT id FROM tasks WHERE user_id = ?').all(user.id) as { id: string }[];
    const existingSubtasks = db.prepare('SELECT id FROM subtasks WHERE user_id = ?').all(user.id) as { id: string }[];
    const existingTaskIds = new Set(existingTasks.map(t => t.id));
    const existingSubtaskIds = new Set(existingSubtasks.map(s => s.id));

    let restoredTasks = 0;
    let restoredSubtasks = 0;
    const idMapping: Record<string, string> = {};

    // 恢复任务
    if (backupData.tasks && Array.isArray(backupData.tasks)) {
      for (const task of backupData.tasks) {
        // 生成新 ID 避免冲突
        const newTaskId = generateId();
        idMapping[task.id] = newTaskId;

        // 检查必填字段
        if (!task.title) continue;

        db.prepare(`
          INSERT INTO tasks (id, user_id, title, description, category, priority, status, deadline, plan_date, estimated_time, completed_at, is_deleted, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          newTaskId,
          user.id,
          task.title,
          task.description || null,
          task.category || '其他',
          task.priority || 'medium',
          task.status || 'pending',
          task.deadline || null,
          task.plan_date || null,
          task.estimated_time || null,
          task.completed_at || null,
          task.is_deleted || 0,
          task.created_at || new Date().toISOString(),
          new Date().toISOString()
        );
        restoredTasks++;
      }
    }

    // 恢复子任务
    if (backupData.subtasks && Array.isArray(backupData.subtasks)) {
      for (const subtask of backupData.subtasks) {
        if (!subtask.title || !idMapping[subtask.task_id]) continue;

        const newSubtaskId = generateId();

        db.prepare(`
          INSERT INTO subtasks (id, task_id, user_id, title, description, completed, sort_order, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          newSubtaskId,
          idMapping[subtask.task_id],
          user.id,
          subtask.title,
          subtask.description || null,
          subtask.completed || 0,
          subtask.sort_order || 0,
          subtask.created_at || new Date().toISOString(),
          new Date().toISOString()
        );
        restoredSubtasks++;
      }
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      message: `已恢复 ${restoredTasks} 个任务和 ${restoredSubtasks} 个子任务`,
      data: {
        tasksRestored: restoredTasks,
        subtasksRestored: restoredSubtasks,
        backupTimestamp: backupData.timestamp
      }
    });
  } catch (error) {
    console.error('Restore tasks error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: '恢复失败'
    }, { status: 500 });
  }
}

// 获取备份列表
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '请先登录'
      }, { status: 401 });
    }

    // 检查 S3 是否可用
    const isAvailable = await checkStorageAvailable(user.id);
    if (!isAvailable) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'S3 存储未配置或不可用'
      }, { status: 400 });
    }

    const result = await listBackupsFromS3(user.id);
    if (result.success) {
      return NextResponse.json<ApiResponse>({
        success: true,
        data: result.backups || []
      });
    } else {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: result.error
      }, { status: 500 });
    }
  } catch (error) {
    console.error('List backups error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: '获取备份列表失败'
    }, { status: 500 });
  }
}
