'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTasks } from '@/hooks/useTasks';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { statsApi, plansApi } from '@/lib/api';
import { format } from 'date-fns';
import {
  BookOpen,
  Calendar,
  CheckCircle,
  Clock,
  Flame,
  PlayCircle,
  Target,
  Timer,
  TrendingUp,
  Plus,
  ArrowRight,
  Sparkles
} from 'lucide-react';

export default function DashboardPage() {
  const { user, refreshUser } = useAuth();
  const { tasks, loading: tasksLoading } = useTasks();
  const [stats, setStats] = useState<any>(null);
  const [todayCheckIn, setTodayCheckIn] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const statsRes = await statsApi.getStats(7);
    if (statsRes.success) {
      setStats(statsRes.data);
    }

    const checkInRes = await plansApi.getCheckIns(1);
    if (checkInRes.success && checkInRes.data?.checkIns?.length > 0) {
      const today = format(new Date(), 'yyyy-MM-dd');
      const checked = checkInRes.data.checkIns.some((c: any) => c.date === today);
      setTodayCheckIn(checked);
    }
  };

  // 计算统计数据
  const pendingTasks = tasks.filter(t => t.status !== 'completed').length;
  const completedToday = tasks.filter(t => 
    t.status === 'completed' && 
    t.completed_at && 
    format(new Date(t.completed_at), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
  ).length;
  const highPriorityTasks = tasks.filter(t => t.priority === 'high' && t.status !== 'completed').length;

  // 今日计划进度
  const todayProgress = stats?.today?.planned_tasks > 0 
    ? Math.round((stats?.today?.completed_tasks / stats?.today?.planned_tasks) * 100)
    : 0;

  return (
    <div className="space-y-6 animate-in">
      {/* 欢迎横幅 */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 p-6 text-white">
        <div className="relative z-10">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">
            你好，{user?.username}！👋
          </h1>
          <p className="text-white/80">
            {todayCheckIn 
              ? '今日已打卡，继续保持！' 
              : '今天也要加油学习哦！'}
          </p>
        </div>
        <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3" />
        <div className="absolute right-20 bottom-0 w-32 h-32 bg-white/10 rounded-full translate-y-1/2" />
      </div>

      {/* 快速统计 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="card-hover">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Flame className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{user?.streak_days || 0}</p>
                <p className="text-xs text-muted-foreground">连续打卡</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="card-hover">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-cyan-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{Math.floor((user?.total_study_time || 0) / 60)}</p>
                <p className="text-xs text-muted-foreground">总学习(小时)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="card-hover">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Target className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingTasks}</p>
                <p className="text-xs text-muted-foreground">待办任务</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="card-hover">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <PlayCircle className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{completedToday}</p>
                <p className="text-xs text-muted-foreground">今日完成</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 今日概览 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 今日计划进度 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              今日计划
              <Badge variant="outline" className="ml-auto">
                {format(new Date(), 'MM月dd日')}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">今日完成度</span>
                <span className="text-sm text-muted-foreground">{todayProgress}%</span>
              </div>
              <Progress value={todayProgress} className="h-3" />
              
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold text-emerald-500">{stats?.today?.total_study_time || 0}m</p>
                  <p className="text-xs text-muted-foreground">学习时长</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold text-cyan-500">{stats?.today?.completed_tasks || 0}</p>
                  <p className="text-xs text-muted-foreground">完成任务</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold text-blue-500">{highPriorityTasks}</p>
                  <p className="text-xs text-muted-foreground">高优先级</p>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <Link href="/tasks" className="flex-1">
                  <Button variant="outline" className="w-full">
                    <BookOpen className="w-4 h-4 mr-2" />
                    查看任务
                  </Button>
                </Link>
                <Link href="/plans" className="flex-1">
                  <Button className="gradient-bg w-full">
                    <Calendar className="w-4 h-4 mr-2" />
                    制定计划
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 快捷入口 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">快捷入口</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/pomodoro">
              <Button variant="outline" className="w-full justify-start">
                <Timer className="w-5 h-5 mr-3 text-emerald-500" />
                开启番茄钟
                <ArrowRight className="w-4 h-4 ml-auto" />
              </Button>
            </Link>
            <Link href="/tasks">
              <Button variant="outline" className="w-full justify-start">
                <Plus className="w-5 h-5 mr-3 text-cyan-500" />
                添加新任务
                <ArrowRight className="w-4 h-4 ml-auto" />
              </Button>
            </Link>
            <Link href="/stats">
              <Button variant="outline" className="w-full justify-start">
                <TrendingUp className="w-5 h-5 mr-3 text-blue-500" />
                查看统计
                <ArrowRight className="w-4 h-4 ml-auto" />
              </Button>
            </Link>
            <Link href="/plans">
              <Button variant="outline" className="w-full justify-start">
                <CheckCircle className="w-5 h-5 mr-3 text-amber-500" />
                今日打卡
                <ArrowRight className="w-4 h-4 ml-auto" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* 待办任务预览 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            待办任务
            {pendingTasks > 0 && (
              <Badge variant="secondary">{pendingTasks}</Badge>
            )}
          </CardTitle>
          <Link href="/tasks">
            <Button variant="ghost" size="sm">
              查看全部
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {tasksLoading ? (
            <div className="text-center py-8 text-muted-foreground">加载中...</div>
          ) : tasks.filter(t => t.status !== 'completed').length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="font-medium">太棒了！</p>
              <p className="text-sm text-muted-foreground">所有任务都已完成</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.filter(t => t.status !== 'completed').slice(0, 5).map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className={`w-3 h-3 rounded-full ${
                    task.priority === 'high' ? 'bg-red-500' :
                    task.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{task.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {task.category} · {task.deadline ? `截止 ${format(new Date(task.deadline), 'MM/dd')}` : '无截止日期'}
                    </p>
                  </div>
                  <Badge variant="outline" className={
                    task.status === 'in_progress' ? 'bg-cyan-500/10 text-cyan-600' : ''
                  }>
                    {task.status === 'in_progress' ? '进行中' : '待办'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 学习提示 */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="font-medium text-blue-600 dark:text-blue-400">今日学习建议</p>
              <p className="text-sm text-muted-foreground mt-1">
                建议先处理高优先级任务，合理安排番茄钟时间。完成计划后记得打卡哦！
              </p>
              <div className="flex gap-2 mt-3">
                <Link href="/pomodoro">
                  <Button size="sm" className="gradient-bg">
                    <Timer className="w-4 h-4 mr-2" />
                    开始专注
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
