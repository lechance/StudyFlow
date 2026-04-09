import { NextRequest, NextResponse } from 'next/server';
import { getDb, generateId } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import type { ApiResponse, StudyRecord } from '@/lib/types';

// 获取学习记录
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
    let query = 'SELECT * FROM study_records WHERE user_id = ?';
    const params: any[] = [user.id];

    if (date) {
      query += ' AND date = ?';
      params.push(date);
    } else if (startDate && endDate) {
      query += ' AND date >= ? AND date <= ?';
      params.push(startDate, endDate);
    }

    query += ' ORDER BY created_at DESC';

    const records = db.prepare(query).all(...params) as StudyRecord[];

    return NextResponse.json<ApiResponse>({
      success: true,
      data: records
    });
  } catch (error) {
    console.error('Get study records error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: '获取学习记录失败'
    }, { status: 500 });
  }
}

// 添加学习记录
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
    const { duration, task_id, date } = body;

    if (!duration || duration <= 0) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: '学习时长必须大于0'
      }, { status: 400 });
    }

    const db = getDb();
    const recordId = generateId();
    const studyDate = date || new Date().toISOString().split('T')[0];

    db.prepare(`
      INSERT INTO study_records (id, user_id, task_id, duration, date)
      VALUES (?, ?, ?, ?, ?)
    `).run(recordId, user.id, task_id || null, duration, studyDate);

    // 更新用户总学习时长
    db.prepare(`
      UPDATE users SET total_study_time = total_study_time + ? WHERE id = ?
    `).run(duration, user.id);

    const record = db.prepare('SELECT * FROM study_records WHERE id = ?').get(recordId) as StudyRecord;

    return NextResponse.json<ApiResponse>({
      success: true,
      data: record,
      message: '学习记录已保存'
    });
  } catch (error) {
    console.error('Add study record error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: '保存学习记录失败'
    }, { status: 500 });
  }
}
