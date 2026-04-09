'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { statsApi } from '@/lib/api';
import { BarChart3, TrendingUp, Clock, Target, Flame, Calendar } from 'lucide-react';
import { format, subDays, isToday } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export default function StatsPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  useEffect(() => {
    loadStats();
  }, [days]);

  const loadStats = async () => {
    setLoading(true);
    const res = await statsApi.getStats(days);
    if (res.success) {
      setStats(res.data);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">加载中...</div>
      </div>
    );
  }

  const { dailyStats, today, totalStudyTime, streakDays } = stats || {
    dailyStats: [],
    today: { total_study_time: 0, completed_tasks: 0, pending_tasks: 0, planned_tasks: 0 },
    totalStudyTime: 0,
    streakDays: 0
  };

  // 计算本周总学习时长
  const weekTotalTime = dailyStats?.reduce((sum: number, day: any) => sum + day.total_study_time, 0) || 0;
  
  // 计算本周完成任务数
  const weekCompletedTasks = dailyStats?.reduce((sum: number, day: any) => sum + day.completed_tasks, 0) || 0;
  
  // 计算平均每日学习时长
  const avgDailyTime = weekTotalTime / (days || 1);
  
  // 计算今日完成率
  const todayProgress = today.planned_tasks > 0 
    ? Math.round((today.completed_tasks / today.planned_tasks) * 100) 
    : 0;

  return (
    <div className="space-y-6 animate-in">
      {/* 页面标题 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">数据统计</h1>
          <p className="text-muted-foreground mt-1">回顾学习成果，激励持续进步</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={days === 7 ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDays(7)}
          >
            近7天
          </Button>
          <Button
            variant={days === 14 ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDays(14)}
          >
            近14天
          </Button>
          <Button
            variant={days === 30 ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDays(30)}
          >
            近30天
          </Button>
        </div>
      </div>

      {/* 核心统计卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="card-hover">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{Math.floor(weekTotalTime / 60)}h {weekTotalTime % 60}m</p>
                <p className="text-xs text-muted-foreground">本周学习时长</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="card-hover">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                <Target className="w-6 h-6 text-cyan-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{weekCompletedTasks}</p>
                <p className="text-xs text-muted-foreground">本周完成任务</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="card-hover">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{Math.floor(avgDailyTime)}m</p>
                <p className="text-xs text-muted-foreground">日均学习</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="card-hover">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Flame className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{streakDays}</p>
                <p className="text-xs text-muted-foreground">连续打卡</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 今日概览 */}
      <Card className="bg-gradient-to-r from-emerald-500/10 to-cyan-500/10">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            今日概览
            {isToday(new Date()) && <Badge>今天</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-emerald-500">{today.total_study_time}m</p>
              <p className="text-sm text-muted-foreground">学习时长</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-cyan-500">{today.completed_tasks}</p>
              <p className="text-sm text-muted-foreground">完成任务</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-500">{today.pending_tasks}</p>
              <p className="text-sm text-muted-foreground">待办任务</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-amber-500">{todayProgress}%</p>
              <p className="text-sm text-muted-foreground">完成率</p>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">今日计划完成度</span>
              <span className="text-sm text-muted-foreground">{todayProgress}%</span>
            </div>
            <Progress value={todayProgress} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* 每日学习趋势 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            学习趋势
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dailyStats?.map((day: any, index: number) => {
              const maxTime = Math.max(...(dailyStats?.map((d: any) => d.total_study_time) || [1]));
              const barWidth = maxTime > 0 ? (day.total_study_time / maxTime) * 100 : 0;
              const isTodayDate = isToday(new Date(day.date));
              
              return (
                <div key={index} className="flex items-center gap-4">
                  <div className="w-20 text-sm text-muted-foreground">
                    {isTodayDate ? '今天' : format(new Date(day.date), 'MM/dd', { locale: zhCN })}
                  </div>
                  <div className="flex-1">
                    <div className="h-8 bg-muted rounded-lg overflow-hidden relative">
                      <div
                        className={`h-full rounded-lg transition-all duration-500 ${
                          isTodayDate 
                            ? 'bg-gradient-to-r from-emerald-500 to-cyan-500' 
                            : 'bg-emerald-500/60'
                        }`}
                        style={{ width: `${barWidth}%` }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-sm font-medium">
                          {day.total_study_time > 0 ? `${day.total_study_time}m` : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="w-20 text-right">
                    <Badge variant={day.completed_tasks > 0 ? 'default' : 'outline'}>
                      {day.completed_tasks} 任务
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 学习统计详情 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 学习时长分布 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">学习时长分布</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dailyStats?.filter((day: any) => day.total_study_time > 0).length === 0 ? (
                <p className="text-center text-muted-foreground py-8">暂无学习记录</p>
              ) : (
                dailyStats?.filter((day: any) => day.total_study_time > 0).map((day: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <Clock className="w-5 h-5 text-emerald-500" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {isToday(new Date(day.date)) ? '今天' : format(new Date(day.date), 'MM月dd日', { locale: zhCN })}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          完成 {day.completed_tasks} 个任务
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-emerald-500">{day.total_study_time}m</p>
                      <p className="text-xs text-muted-foreground">
                        {Math.floor(day.total_study_time / 60)}h {day.total_study_time % 60}m
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* 成就统计 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">学习成就</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 text-center">
                <div className="w-12 h-12 rounded-full bg-amber-500/30 mx-auto mb-2 flex items-center justify-center">
                  <Flame className="w-6 h-6 text-amber-600" />
                </div>
                <p className="text-2xl font-bold">{streakDays}</p>
                <p className="text-sm text-muted-foreground">连续打卡天数</p>
              </div>
              <div className="p-4 rounded-lg bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-500/30 mx-auto mb-2 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-emerald-600" />
                </div>
                <p className="text-2xl font-bold">{Math.floor((totalStudyTime || 0) / 60)}</p>
                <p className="text-sm text-muted-foreground">总学习小时</p>
              </div>
              <div className="p-4 rounded-lg bg-gradient-to-br from-blue-500/20 to-indigo-500/20 text-center">
                <div className="w-12 h-12 rounded-full bg-blue-500/30 mx-auto mb-2 flex items-center justify-center">
                  <Target className="w-6 h-6 text-blue-600" />
                </div>
                <p className="text-2xl font-bold">{weekCompletedTasks}</p>
                <p className="text-sm text-muted-foreground">本周完成任务</p>
              </div>
              <div className="p-4 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 text-center">
                <div className="w-12 h-12 rounded-full bg-purple-500/30 mx-auto mb-2 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
                <p className="text-2xl font-bold">{Math.floor(avgDailyTime)}</p>
                <p className="text-sm text-muted-foreground">日均分钟</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
