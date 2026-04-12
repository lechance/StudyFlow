import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import type { ApiResponse } from '@/lib/types';
import { backupTasksToS3, getLatestBackupFromS3, listBackupsFromS3, checkStorageAvailable } from '@/lib/storage';

// 手动备份任务到 S3
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
        error: 'S3 存储未配置或不可用，请先在设置中配置并启用 S3 存储'
      }, { status: 400 });
    }

    // 获取所有任务（包括已删除的）
    const db = getDb();
    const tasks = db.prepare('SELECT * FROM tasks WHERE user_id = ?').all(user.id);
    const subtasks = db.prepare('SELECT * FROM subtasks WHERE user_id = ?').all(user.id);

    // 备份到 S3
    const result = await backupTasksToS3(user.id, { tasks, subtasks });

    if (result.success) {
      return NextResponse.json<ApiResponse>({
        success: true,
        message: '任务已备份到 S3',
        data: { key: result.key }
      });
    } else {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: result.error || '备份失败'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Backup tasks error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: '备份失败'
    }, { status: 500 });
  }
}
