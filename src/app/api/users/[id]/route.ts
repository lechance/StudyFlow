import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser, verifyPassword, hashPassword } from '@/lib/auth';
import type { ApiResponse } from '@/lib/types';

// 更新用户信息
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '请先登录'
      }, { status: 401 });
    }

    const { id } = await params;

    // 只允许用户修改自己的信息
    if (id !== user.id) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '权限不足'
      }, { status: 403 });
    }

    const body = await request.json();
    const db = getDb();

    const updates: string[] = [];
    const values: any[] = [];

    // 更新用户名
    if (body.username !== undefined) {
      // 检查用户名是否已被占用
      const existingUser = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(body.username, id);
      if (existingUser) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: '用户名已被占用'
        }, { status: 400 });
      }
      updates.push('username = ?');
      values.push(body.username);
    }

    // 更新签名
    if (body.signature !== undefined) {
      updates.push('signature = ?');
      values.push(body.signature || null);
    }

    // 更新密码 - 必须验证当前密码
    if (body.password !== undefined) {
      if (body.password.length < 6) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: '密码长度至少6位'
        }, { status: 400 });
      }
      
      // 验证当前密码
      if (!body.currentPassword) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: '请输入当前密码'
        }, { status: 400 });
      }
      
      // 获取当前用户的密码
      const userRecord = db.prepare('SELECT password FROM users WHERE id = ?').get(id) as { password: string } | undefined;
      if (!userRecord) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: '用户不存在'
        }, { status: 404 });
      }
      
      // 验证当前密码是否正确
      const isCurrentPasswordValid = await verifyPassword(body.currentPassword, userRecord.password);
      if (!isCurrentPasswordValid) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: '当前密码错误'
        }, { status: 400 });
      }
      
      const hashedPassword = await hashPassword(body.password);
      updates.push('password = ?');
      values.push(hashedPassword);
    }

    // 更新邮箱
    if (body.email !== undefined) {
      updates.push('email = ?');
      values.push(body.email || null);
    }

    if (updates.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '没有需要更新的字段'
      }, { status: 400 });
    }

    updates.push('updated_at = datetime(\'now\')');
    values.push(id);

    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    const updatedUser = db.prepare('SELECT id, username, email, signature, role, avatar, streak_days, total_study_time, created_at FROM users WHERE id = ?').get(id);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: updatedUser,
      message: '用户信息更新成功'
    });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: '更新用户信息失败'
    }, { status: 500 });
  }
}

// 删除用户（管理员）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '请先登录'
      }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '权限不足'
      }, { status: 403 });
    }

    const { id } = await params;
    const db = getDb();

    // 不允许删除自己
    if (id === user.id) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '不能删除自己'
      }, { status: 400 });
    }

    // 删除用户的所有数据
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id);
    db.prepare('DELETE FROM tasks WHERE user_id = ?').run(id);
    db.prepare('DELETE FROM study_records WHERE user_id = ?').run(id);
    db.prepare('DELETE FROM daily_plans WHERE user_id = ?').run(id);
    db.prepare('DELETE FROM recycle_bin WHERE user_id = ?').run(id);
    db.prepare('DELETE FROM pomodoro_settings WHERE user_id = ?').run(id);
    db.prepare('DELETE FROM users WHERE id = ?').run(id);

    return NextResponse.json<ApiResponse>({
      success: true,
      message: '用户已删除'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: '删除用户失败'
    }, { status: 500 });
  }
}
