import { getDb } from '@/lib/db';
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

// 创建数据库备份
export async function createDatabaseBackup(userId: string = 'system'): Promise<{ success: boolean; key?: string; error?: string }> {
  const storage = getS3Storage();
  if (!storage) {
    return { success: false, error: 'S3 存储未配置或未启用' };
  }

  try {
    const dbPath = getDatabasePath();
    
    if (!fs.existsSync(dbPath)) {
      return { success: false, error: '数据库文件不存在' };
    }

    const dbBuffer = fs.readFileSync(dbPath);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `db_backup_${timestamp}.db`;
    const fileKey = `db/backups/${backupFileName}`;

    await storage.uploadFile({
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
      `).run(backupId, userId, fileKey, backupFileName, dbBuffer.length);
    } catch (e: any) {
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
        `).run(backupId, userId, fileKey, backupFileName, dbBuffer.length);
      }
    }

    // 清理旧备份（保留最近 10 个）
    try {
      db.prepare(`
        DELETE FROM db_backups 
        WHERE user_id = ? AND id NOT IN (
          SELECT id FROM db_backups WHERE user_id = ? ORDER BY created_at DESC LIMIT 10
        )
      `).run(userId, userId);
    } catch (e) {
      // ignore
    }

    return { success: true, key: fileKey };
  } catch (error: any) {
    console.error('Database backup error:', error);
    return { success: false, error: error.message || '备份失败' };
  }
}

// 检查是否应该执行定时备份
export function shouldRunScheduledBackup(): boolean {
  try {
    const db = getDb();
    const settings = db.prepare(`
      SELECT auto_backup_enabled, auto_backup_interval, last_auto_backup
      FROM storage_settings 
      WHERE enabled = 1
      LIMIT 1
    `).get() as any;

    if (!settings || !settings.auto_backup_enabled) {
      return false;
    }

    const interval = settings.auto_backup_interval || 'daily'; // daily, weekly
    const lastBackup = settings.last_auto_backup;

    if (!lastBackup) {
      return true;
    }

    const lastBackupDate = new Date(lastBackup);
    const now = new Date();
    const hoursSinceLastBackup = (now.getTime() - lastBackupDate.getTime()) / (1000 * 60 * 60);

    switch (interval) {
      case 'hourly':
        return hoursSinceLastBackup >= 1;
      case 'daily':
        return hoursSinceLastBackup >= 24;
      case 'weekly':
        return hoursSinceLastBackup >= 168; // 7 * 24
      default:
        return false;
    }
  } catch (error) {
    return false;
  }
}

// 更新最后自动备份时间
export function updateLastAutoBackup(): void {
  try {
    const db = getDb();
    db.prepare(`
      UPDATE storage_settings 
      SET last_auto_backup = datetime('now')
      WHERE enabled = 1
    `).run();
  } catch (error) {
    console.error('Update last auto backup error:', error);
  }
}

// 调度器单例
let schedulerInterval: NodeJS.Timeout | null = null;

// 启动调度器
export function startBackupScheduler(): void {
  if (schedulerInterval) {
    return; // 已启动
  }

  // 检查时间间隔（每 30 分钟检查一次）
  schedulerInterval = setInterval(async () => {
    try {
      if (shouldRunScheduledBackup()) {
        console.log('[Scheduler] Running scheduled database backup...');
        const result = await createDatabaseBackup();
        if (result.success) {
          console.log('[Scheduler] Scheduled backup completed:', result.key);
          updateLastAutoBackup();
        } else {
          console.error('[Scheduler] Scheduled backup failed:', result.error);
        }
      }
    } catch (error) {
      console.error('[Scheduler] Error during scheduled backup check:', error);
    }
  }, 30 * 60 * 1000); // 30 minutes

  console.log('[Scheduler] Database backup scheduler started');
}

// 停止调度器
export function stopBackupScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('[Scheduler] Database backup scheduler stopped');
  }
}
