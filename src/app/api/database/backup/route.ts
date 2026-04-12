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

// POST - 创建数据库备份
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

    const dbPath = getDatabasePath();
    
    // 检查数据库文件是否存在
    if (!fs.existsSync(dbPath)) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '数据库文件不存在'
      }, { status: 404 });
    }

    // 读取数据库文件
    const dbBuffer = fs.readFileSync(dbPath);
    
    // 生成备份文件名
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `db_backup_${timestamp}.db`;
    const fileKey = `db/backups/${backupFileName}`;

    // 上传到 S3
    const resultKey = await storage.uploadFile({
      fileContent: dbBuffer,
      fileName: backupFileName,
      contentType: 'application/x-sqlite3'
    });

    // 保存备份记录
    const db = getDb();
    const backupId = Date.now().toString(36) + Math.random().toString(36).substring(2);
    
    try {
      db.prepare(`
        INSERT INTO db_backups (id, user_id, backup_key, file_name, file_size, created_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
      `).run(backupId, user.id, fileKey, backupFileName, dbBuffer.length);
    } catch (e: any) {
      // 表可能不存在，先创建
      if (e.message.includes('no such table')) {
        db.exec(`
          CREATE TABLE IF NOT EXISTS db_backups (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            backup_key TEXT NOT NULL,
            file_name TEXT NOT NULL,
            file_size INTEGER,
            created_at TEXT DEFAULT (datetime('now'))
          )
        `);
        db.prepare(`
          INSERT INTO db_backups (id, user_id, backup_key, file_name, file_size, created_at)
          VALUES (?, ?, ?, ?, ?, datetime('now'))
        `).run(backupId, user.id, fileKey, backupFileName, dbBuffer.length);
      }
    }

    // 清理旧备份（保留最近 10 个）
    try {
      db.prepare(`
        DELETE FROM db_backups 
        WHERE user_id = ? AND id NOT IN (
          SELECT id FROM db_backups WHERE user_id = ? ORDER BY created_at DESC LIMIT 10
        )
      `).run(user.id, user.id);
    } catch (e) {
      // ignore
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      message: '数据库备份成功',
      data: {
        key: fileKey,
        fileName: backupFileName,
        fileSize: dbBuffer.length
      }
    });
  } catch (error: any) {
    console.error('Database backup error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: error.message || '备份失败'
    }, { status: 500 });
  }
}

// GET - 获取备份列表
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
    const backups = db.prepare(`
      SELECT id, backup_key, file_name, file_size, created_at
      FROM db_backups 
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 20
    `).all(user.id);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: backups
    });
  } catch (error: any) {
    console.error('Get backups error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: error.message || '获取备份列表失败'
    }, { status: 500 });
  }
}
