import { getDb } from '@/lib/db';
import { S3Storage } from 'coze-coding-dev-sdk';

interface StorageConfig {
  endpoint_url: string | null;
  access_key: string | null;
  secret_key: string | null;
  bucket_name: string | null;
  region: string;
  enabled: number;
}

// 获取用户的 S3 存储配置
export function getUserStorageConfig(userId: string): StorageConfig | null {
  const db = getDb();
  const settings = db.prepare(`
    SELECT endpoint_url, access_key, secret_key, bucket_name, region, enabled
    FROM storage_settings WHERE user_id = ? AND enabled = 1
  `).get(userId) as StorageConfig | undefined;

  if (!settings || !settings.endpoint_url || !settings.access_key || !settings.secret_key || !settings.bucket_name) {
    return null;
  }

  return settings;
}

// 创建 S3 存储实例
export function createStorage(userId: string): S3Storage | null {
  const config = getUserStorageConfig(userId);
  if (!config) {
    return null;
  }

  return new S3Storage({
    endpointUrl: config.endpoint_url!,
    accessKey: config.access_key!,
    secretKey: config.secret_key!,
    bucketName: config.bucket_name!,
    region: config.region || 'us-east-1'
  });
}

// 任务数据的键名
const TASK_DATA_KEY_PREFIX = 'tasks/backup_';

// 备份任务数据到 S3
export async function backupTasksToS3(userId: string, tasks: any): Promise<{ success: boolean; key?: string; error?: string }> {
  const storage = createStorage(userId);
  if (!storage) {
    return { success: false, error: 'S3 存储未配置或未启用' };
  }

  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `tasks_backup_${userId}_${timestamp}.json`;
    const fileKey = `${TASK_DATA_KEY_PREFIX}${fileName}`;

    const backupData = {
      userId,
      timestamp: new Date().toISOString(),
      version: '1.0',
      tasks: tasks
    };

    const buffer = Buffer.from(JSON.stringify(backupData, null, 2), 'utf-8');
    const resultKey = await storage.uploadFile({
      fileContent: buffer,
      fileName: fileKey,
      contentType: 'application/json'
    });

    return { success: true, key: resultKey };
  } catch (error: any) {
    console.error('Backup tasks to S3 error:', error);
    return { success: false, error: error.message || '备份失败' };
  }
}

// 从 S3 获取最新备份
export async function getLatestBackupFromS3(userId: string): Promise<{ success: boolean; data?: any; error?: string }> {
  const storage = createStorage(userId);
  if (!storage) {
    return { success: false, error: 'S3 存储未配置或未启用' };
  }

  try {
    // 列出用户的备份文件
    const result = await storage.listFiles({
      prefix: TASK_DATA_KEY_PREFIX,
      maxKeys: 100
    });

    if (!result.keys || result.keys.length === 0) {
      return { success: false, error: '暂无备份数据' };
    }

    // 按时间排序，找到最新的备份
    const sortedKeys = result.keys.sort((a: any, b: any) => {
      const timeA = a.lastModified?.getTime() || 0;
      const timeB = b.lastModified?.getTime() || 0;
      return timeB - timeA;
    });

    const latestKey = sortedKeys[0];
    if (!latestKey) {
      return { success: false, error: '暂无备份数据' };
    }

    // 读取备份文件
    const fileBuffer = await storage.readFile({ fileKey: latestKey });
    const backupData = JSON.parse(fileBuffer.toString('utf-8'));

    return { success: true, data: backupData };
  } catch (error: any) {
    console.error('Get latest backup from S3 error:', error);
    return { success: false, error: error.message || '获取备份失败' };
  }
}

// 列出所有备份
export async function listBackupsFromS3(userId: string): Promise<{ success: boolean; backups?: any[]; error?: string }> {
  const storage = createStorage(userId);
  if (!storage) {
    return { success: false, error: 'S3 存储未配置或未启用' };
  }

  try {
    const result = await storage.listFiles({
      prefix: TASK_DATA_KEY_PREFIX,
      maxKeys: 100
    });

    if (!result.keys || result.keys.length === 0) {
      return { success: true, backups: [] };
    }

    // 排序并格式化
    const backups = result.keys
      .map((item: any) => ({
        key: item.key,
        lastModified: item.lastModified,
        size: item.size
      }))
      .sort((a: any, b: any) => {
        const timeA = a.lastModified?.getTime() || 0;
        const timeB = b.lastModified?.getTime() || 0;
        return timeB - timeA;
      });

    return { success: true, backups };
  } catch (error: any) {
    console.error('List backups from S3 error:', error);
    return { success: false, error: error.message || '获取备份列表失败' };
  }
}

// 检查 S3 存储是否可用
export async function checkStorageAvailable(userId: string): Promise<boolean> {
  const storage = createStorage(userId);
  if (!storage) {
    return false;
  }

  try {
    await storage.listFiles({ maxKeys: 1 });
    return true;
  } catch {
    return false;
  }
}
