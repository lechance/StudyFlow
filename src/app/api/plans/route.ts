import { NextRequest, NextResponse } from 'next/server';
import { getDb, generateId } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import type { ApiResponse, DailyPlan } from '@/lib/types';

// 获取每日计划
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
    const date = searchParams.get('date'); // YYYY-MM-DD
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const db = getDb();
    let query = 'SELECT * FROM daily_plans WHERE user_id = ?';
    const params: any[] = [user.id];

    if (date) {
      query += ' AND date = ?';
      params.push(date);
    } else if (startDate && endDate) {
      query += ' AND date >= ? AND date <= ?';
      params.push(startDate, endDate);
    } else {
      // 默认获取今天的计划
      query += ' AND date = ?';
      params.push(new Date().toISOString().split('T')[0]);
    }

    query += ' ORDER BY created_at ASC';

    const plans = db.prepare(query).all(...params) as DailyPlan[];

    return NextResponse.json<ApiResponse>({
      success: true,
      data: plans
    });
  } catch (error) {
    console.error('Get daily plans error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: '获取每日计划失败'
    }, { status: 500 });
  }
}

// 创建/更新每日计划
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
    const { date, content } = body;

    if (!date || !content) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '日期和内容不能为空'
      }, { status: 400 });
    }

    const db = getDb();

    // 检查是否已存在该日期的计划
    const existingPlan = db.prepare('SELECT * FROM daily_plans WHERE user_id = ? AND date = ?').get(user.id, date) as DailyPlan | undefined;

    if (existingPlan) {
      // 更新
      db.prepare('UPDATE daily_plans SET content = ?, updated_at = datetime(\'now\') WHERE id = ?').run(content, existingPlan.id);
      const updatedPlan = db.prepare('SELECT * FROM daily_plans WHERE id = ?').get(existingPlan.id) as DailyPlan;
      return NextResponse.json<ApiResponse>({
        success: true,
        data: updatedPlan,
        message: '计划已更新'
      });
    } else {
      // 创建
      const planId = generateId();
      db.prepare(`
        INSERT INTO daily_plans (id, user_id, date, content, completed)
        VALUES (?, ?, ?, ?, 0)
      `).run(planId, user.id, date, content);

      const plan = db.prepare('SELECT * FROM daily_plans WHERE id = ?').get(planId) as DailyPlan;
      return NextResponse.json<ApiResponse>({
        success: true,
        data: plan,
        message: '计划已创建'
      });
    }
  } catch (error) {
    console.error('Create/update daily plan error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: '保存每日计划失败'
    }, { status: 500 });
  }
}
