import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import type { ApiResponse } from '@/lib/types';
import { S3Storage } from 'coze-coding-dev-sdk';
import fs from 'fs';
import path from 'path';

// 获取 S3 存储实例
function getS3Storage(): S3Storage | null {
  const db = getDb();
  const settings = db.prepare(`
    SELECT endpoint_url, access_key, secret_key, bucket_name, region, enabled
    FROM storage_settings WHERE user_id = 'system' AND enabled = 1
  `).get() as any;

  if (!settings || !settings.endpoint_url || !settings.access_key || !settings.secret_key || !settings.bucket_name) {
    return null;
  }

  return new S3Storage({
    endpointUrl: settings.endpoint_url,
    accessKey: settings.access_key,
    secretKey: settings.secret_key,
    bucketName: settings.bucket_name,
    region: settings.region || 'us-east-1'
  });
}

// 获取数据库文件路径
function getDatabasePath(): string {
  const isProdEnv = process.env.COZE_PROJECT_ENV === 'PROD';
  const dbBaseDir = isProdEnv ? '/app/work/studyflow-data' : path.join(process.cwd(), 'data');
  return path.join(dbBaseDir, 'study.db');
}

// 获取备份目录
function getBackupDir(): string {
  const isProdEnv = process.env.COZE_PROJECT_ENV === 'PROD';
  return isProdEnv ? '/app/work/studyflow-backups' : path.join(process.cwd(), 'backups');
}

// POST - 从 S3 恢复数据库
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '请先登录'
      }, { status: 401 });
    }

    const storage = getS3Storage();
    if (!storage) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'S3 存储未配置或未启用'
      }, { status: 400 });
    }

    const body = await request.json();
    const { backupKey } = body;

    if (!backupKey) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '缺少备份文件标识'
      }, { status: 400 });
    }

    // 从 S3 下载备份文件
    const backupBuffer = await storage.readFile({ fileKey: backupKey });
    
    if (!backupBuffer || backupBuffer.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '备份文件为空或读取失败'
      }, { status: 404 });
    }

    // 确保备份目录存在
    const backupDir = getBackupDir();
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // 先备份当前数据库
    const currentDbPath = getDatabasePath();
    if (fs.existsSync(currentDbPath)) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const preBackupPath = path.join(backupDir, `pre_restore_${timestamp}.db`);
      fs.copyFileSync(currentDbPath, preBackupPath);
    }

    // 写入新数据库文件
    fs.writeFileSync(currentDbPath, backupBuffer);

    return NextResponse.json<ApiResponse>({
      success: true,
      message: '数据库恢复成功，请刷新页面',
      data: {
        fileSize: backupBuffer.length
      }
    });
  } catch (error: any) {
    console.error('Database restore error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: error.message || '恢复失败'
    }, { status: 500 });
  }
}

// GET - 获取最新备份（用于快速恢复）
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
    const latestBackup = db.prepare(`
      SELECT id, backup_key, file_name, file_size, created_at
      FROM db_backups 
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `).get(user.id);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: latestBackup || null
    });
  } catch (error: any) {
    console.error('Get latest backup error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: error.message || '获取最新备份失败'
    }, { status: 500 });
  }
}
