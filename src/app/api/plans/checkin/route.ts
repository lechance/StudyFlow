import { NextRequest, NextResponse } from 'next/server';
import { getDb, generateId } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import type { ApiResponse, CheckIn } from '@/lib/types';

// 获取打卡记录
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '请先登录'
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7'); // 默认获取最近7天

    const db = getDb();
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const checkIns = db.prepare(`
      SELECT * FROM check_ins 
      WHERE user_id = ? AND date >= ? AND date <= ?
      ORDER BY date DESC
    `).all(user.id, startDate, endDate) as CheckIn[];

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        checkIns,
        currentStreak: user.streak_days
      }
    });
  } catch (error) {
    console.error('Get check-ins error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: '获取打卡记录失败'
    }, { status: 500 });
  }
}

// 打卡
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
    const { date } = body;
    const checkDate = date || new Date().toISOString().split('T')[0];

    const db = getDb();

    // 检查今天是否已打卡
    const existingCheckIn = db.prepare('SELECT * FROM check_ins WHERE user_id = ? AND date = ?').get(user.id, checkDate) as CheckIn | undefined;
    if (existingCheckIn) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '今天已打卡'
      }, { status: 400 });
    }

    // 计算连续天数
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const lastCheckIn = db.prepare('SELECT * FROM check_ins WHERE user_id = ? ORDER BY date DESC LIMIT 1').get(user.id) as CheckIn | undefined;
    
    let newStreak = 1;
    if (lastCheckIn && lastCheckIn.date === yesterday) {
      newStreak = lastCheckIn.streak + 1;
    }

    const checkInId = generateId();
    db.prepare(`
      INSERT INTO check_ins (id, user_id, date, streak)
      VALUES (?, ?, ?, ?)
    `).run(checkInId, user.id, checkDate, newStreak);

    // 更新用户连续打卡天数
    db.prepare('UPDATE users SET streak_days = ? WHERE id = ?').run(newStreak, user.id);

    const checkIn = db.prepare('SELECT * FROM check_ins WHERE id = ?').get(checkInId) as CheckIn;

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        ...checkIn,
        newStreak
      },
      message: newStreak > 1 ? `已连续打卡${newStreak}天` : '打卡成功'
    });
  } catch (error) {
    console.error('Check-in error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: '打卡失败'
    }, { status: 500 });
  }
}
