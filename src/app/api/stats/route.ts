import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import type { ApiResponse, DailyStats } from '@/lib/types';

// 获取统计数据
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
    const today = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // 获取每日学习时长
    const studyRecords = db.prepare(`
      SELECT date, SUM(duration) as total_duration
      FROM study_records
      WHERE user_id = ? AND date >= ? AND date <= ?
      GROUP BY date
    `).all(user.id, startDate, today) as { date: string; total_duration: number }[];

    // 获取每日完成任务数
    const completedTasks = db.prepare(`
      SELECT DATE(completed_at) as date, COUNT(*) as count
      FROM tasks
      WHERE user_id = ? AND status = 'completed' AND completed_at >= ? AND completed_at <= datetime(?, '+1 day')
      GROUP BY DATE(completed_at)
    `).all(user.id, startDate, today) as { date: string; count: number }[];

    // 获取每日计划任务数
    const dailyPlans = db.prepare(`
      SELECT date, completed
      FROM daily_plans
      WHERE user_id = ? AND date >= ? AND date <= ?
    `).all(user.id, startDate, today) as { date: string; completed: number }[];

    // 合并数据
    const stats: DailyStats[] = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const studyRecord = studyRecords.find(r => r.date === date);
      const completedCount = completedTasks.find(c => c.date === date)?.count || 0;
      const plan = dailyPlans.find(p => p.date === date);

      stats.push({
        date,
        total_study_time: studyRecord?.total_duration || 0,
        completed_tasks: completedCount,
        planned_tasks: plan ? 1 : 0
      });
    }

    // 计算今日统计
    const todayStats = stats.find(s => s.date === today) || {
      date: today,
      total_study_time: 0,
      completed_tasks: 0,
      planned_tasks: 0
    };

    // 获取今日待办任务数
    const pendingTasks = db.prepare(`
      SELECT COUNT(*) as count FROM tasks 
      WHERE user_id = ? AND is_deleted = 0 AND status != 'completed'
    `).get(user.id) as { count: number };

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        dailyStats: stats.reverse(),
        today: {
          ...todayStats,
          pending_tasks: pendingTasks.count
        },
        totalStudyTime: user.total_study_time,
        streakDays: user.streak_days
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: '获取统计数据失败'
    }, { status: 500 });
  }
}
