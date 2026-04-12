import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import type { ApiResponse } from '@/lib/types';
import { S3Storage } from 'coze-coding-dev-sdk';

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
      SELECT id, user_id, provider, endpoint_url, access_key, secret_key, bucket_name, region, enabled
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
      ...settings,
      secret_key_set: !!settings.secret_key,
      secret_key: settings.secret_key ? '********' : null
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
      enabled
    } = body;

    // 检查是否已存在设置
    const existing = db.prepare('SELECT id FROM storage_settings WHERE user_id = ?').get(user.id);

    if (existing) {
      // 更新现有设置
      db.prepare(`
        UPDATE storage_settings SET
          endpoint_url = ?,
          access_key = ?,
          secret_key = ?,
          bucket_name = ?,
          region = ?,
          enabled = ?,
          updated_at = datetime('now')
        WHERE user_id = ?
      `).run(
        endpoint_url || null,
        access_key || null,
        secret_key || null,
        bucket_name || null,
        region || 'us-east-1',
        enabled ? 1 : 0,
        user.id
      );
    } else {
      // 创建新设置
      const id = Date.now().toString(36) + Math.random().toString(36).substring(2);
      db.prepare(`
        INSERT INTO storage_settings (id, user_id, provider, endpoint_url, access_key, secret_key, bucket_name, region, enabled)
        VALUES (?, ?, 's3', ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        user.id,
        endpoint_url || null,
        access_key || null,
        secret_key || null,
        bucket_name || null,
        region || 'us-east-1',
        enabled ? 1 : 0
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
