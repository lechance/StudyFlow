import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import type { ApiResponse, User } from '@/lib/types';

// 更新当前用户信息
export async function POST(
  request: NextRequest
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '请先登录'
      }, { status: 401 });
    }

    const body = await request.json();
    const db = getDb();

    // 检查用户名是否已被其他用户使用
    if (body.username) {
      const existingUser = db.prepare(
        'SELECT id FROM users WHERE username = ? AND id != ?'
      ).get(body.username, currentUser.id);
      
      if (existingUser) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: '用户名已被使用'
        }, { status: 400 });
      }
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (body.username !== undefined) {
      updates.push('username = ?');
      values.push(body.username);
    }
    if (body.email !== undefined) {
      updates.push('email = ?');
      values.push(body.email || null);
    }

    if (updates.length > 0) {
      updates.push('updated_at = datetime(\'now\')');
      values.push(currentUser.id);
      
      db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    }

    // 获取更新后的用户信息
    const updatedUser = db.prepare(
      'SELECT id, username, email, role, streak_days, total_study_time, created_at FROM users WHERE id = ?'
    ).get(currentUser.id) as User;

    return NextResponse.json<ApiResponse>({
      success: true,
      data: updatedUser
    });
  } catch (error) {
    console.error('Update user profile error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: '更新用户信息失败'
    }, { status: 500 });
  }
}
