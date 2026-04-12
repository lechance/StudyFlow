import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import type { ApiResponse } from '@/lib/types';

interface StorageSettings {
  id: string;
  user_id: string;
  provider: string;
  endpoint_url: string | null;
  access_key: string | null;
  secret_key: string | null;
  bucket_name: string | null;
  region: string;
  enabled: number;
  auto_backup_enabled: number;
  auto_backup_interval: string;
  last_auto_backup: string | null;
}

// 获取存储设置
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '请先登录'
      }, { status: 401 });
    }

    const db = getDb();
    const settings = db.prepare(`
      SELECT id, user_id, provider, endpoint_url, access_key, secret_key, bucket_name, region, enabled,
             auto_backup_enabled, auto_backup_interval, last_auto_backup
      FROM storage_settings WHERE user_id = ?
    `).get(user.id) as StorageSettings | undefined;

    if (!settings) {
      return NextResponse.json<ApiResponse>({
        success: true,
        data: null
      });
    }

    // 不返回 secret_key 的完整值，只返回是否已设置
    const safeSettings = {
      id: settings.id,
      user_id: settings.user_id,
      provider: settings.provider,
      endpoint_url: settings.endpoint_url,
      access_key: settings.access_key,
      secret_key_set: !!settings.secret_key,
      secret_key: settings.secret_key ? '********' : null,
      bucket_name: settings.bucket_name,
      region: settings.region,
      enabled: settings.enabled,
      auto_backup_enabled: settings.auto_backup_enabled,
      auto_backup_interval: settings.auto_backup_interval,
      last_auto_backup: settings.last_auto_backup
    };

    return NextResponse.json<ApiResponse>({
      success: true,
      data: safeSettings
    });
  } catch (error) {
    console.error('Get storage settings error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: '获取存储设置失败'
    }, { status: 500 });
  }
}

// 保存存储设置
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
    const db = getDb();
    const {
      endpoint_url,
      access_key,
      secret_key,
      bucket_name,
      region,
      enabled,
      auto_backup_enabled,
      auto_backup_interval
    } = body;

    // 检查是否已存在设置
    const existing = db.prepare('SELECT id FROM storage_settings WHERE user_id = ?').get(user.id);

    if (existing) {
      // 更新现有设置 - 只在有值时更新 secret_key
      let updateSql = `
        UPDATE storage_settings SET
          endpoint_url = ?,
          access_key = ?,
          bucket_name = ?,
          region = ?,
          enabled = ?,
          auto_backup_enabled = ?,
          auto_backup_interval = ?,
          updated_at = datetime('now')
      `;
      let params: any[] = [
        endpoint_url || null,
        access_key || null,
        bucket_name || null,
        region || 'us-east-1',
        enabled ? 1 : 0,
        auto_backup_enabled ? 1 : 0,
        auto_backup_interval || 'daily'
      ];

      // 只有当 secret_key 不为空且不是占位符时才更新
      if (secret_key && secret_key !== '********') {
        updateSql += ', secret_key = ?';
        params.push(secret_key);
      }

      updateSql += ' WHERE user_id = ?';
      params.push(user.id);

      db.prepare(updateSql).run(...params);
    } else {
      // 创建新设置
      const id = Date.now().toString(36) + Math.random().toString(36).substring(2);
      db.prepare(`
        INSERT INTO storage_settings (id, user_id, provider, endpoint_url, access_key, secret_key, bucket_name, region, enabled, auto_backup_enabled, auto_backup_interval)
        VALUES (?, ?, 's3', ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        user.id,
        endpoint_url || null,
        access_key || null,
        secret_key || null,
        bucket_name || null,
        region || 'us-east-1',
        enabled ? 1 : 0,
        auto_backup_enabled ? 1 : 0,
        auto_backup_interval || 'daily'
      );
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      message: '存储设置已保存'
    });
  } catch (error) {
    console.error('Save storage settings error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: '保存存储设置失败'
    }, { status: 500 });
  }
}
