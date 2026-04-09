'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { plansApi } from '@/lib/api';
import { toast } from 'sonner';
import { format, addDays, subDays, isToday, isSameDay } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Calendar as CalendarIcon, CheckCircle, Flame, Plus, ChevronLeft, ChevronRight } from 'lucide-react';

export default function PlansPage() {
  const { user, refreshUser } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [weekDates, setWeekDates] = useState<Date[]>([]);
  const [planContent, setPlanContent] = useState('');
  const [dailyPlan, setDailyPlan] = useState<any>(null);
  const [checkIns, setCheckIns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // 生成周日期
  const generateWeekDates = useCallback((centerDate: Date) => {
    const dates: Date[] = [];
    for (let i = -3; i <= 3; i++) {
      dates.push(addDays(centerDate, i));
    }
    return dates;
  }, []);

  // 加载周视图数据
  const loadWeekData = useCallback(async (dates: Date[]) => {
    if (!dates.length) return;
    
    const startDate = format(dates[0], 'yyyy-MM-dd');
    const endDate = format(dates[dates.length - 1], 'yyyy-MM-dd');
    
    const res = await plansApi.getCheckIns(7);
    if (res.success) {
      setCheckIns(res.data?.checkIns || []);
    }
  }, []);

  // 加载当日计划
  const loadDailyPlan = useCallback(async (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const res = await plansApi.getPlans({ date: dateStr });
    if (res.success && res.data && res.data.length > 0) {
      setDailyPlan(res.data[0]);
      setPlanContent(res.data[0].content || '');
    } else {
      setDailyPlan(null);
      setPlanContent('');
    }
  }, []);

  useEffect(() => {
    setWeekDates(generateWeekDates(selectedDate));
  }, [selectedDate, generateWeekDates]);

  useEffect(() => {
    loadWeekData(weekDates);
    loadDailyPlan(selectedDate);
  }, [weekDates, selectedDate, loadWeekData, loadDailyPlan]);

  // 保存计划
  const savePlan = async () => {
    if (!planContent.trim()) {
      toast.error('请输入计划内容');
      return;
    }

    setSaving(true);
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const res = await plansApi.savePlan(dateStr, planContent);
    
    if (res.success) {
      setDailyPlan(res.data);
      toast.success('计划已保存');
    } else {
      toast.error('保存失败');
    }
    setSaving(false);
  };

  // 打卡
  const handleCheckIn = async () => {
    const res = await plansApi.checkIn();
    if (res.success) {
      await refreshUser();
      await loadWeekData(weekDates);
      toast.success(res.data?.newStreak ? `打卡成功！已连续 ${res.data.newStreak} 天` : '打卡成功');
    } else {
      toast.error(res.error || '打卡失败');
    }
  };

  // 周导航
  const goToPrevWeek = () => {
    setSelectedDate(subDays(selectedDate, 7));
  };

  const goToNextWeek = () => {
    setSelectedDate(addDays(selectedDate, 7));
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  // 检查日期是否已打卡
  const isDateCheckedIn = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return checkIns.some(c => c.date === dateStr);
  };

  // 快捷计划模板
  const planTemplates = [
    '1. 完成数学作业\n2. 复习英语单词\n3. 阅读30分钟',
    '1. 预习下节课内容\n2. 整理笔记\n3. 做练习题',
    '1. 晨读30分钟\n2. 在线课程学习\n3. 复习本周重点',
  ];

  const applyTemplate = (template: string) => {
    setPlanContent(template);
  };

  return (
    <div className="space-y-6 animate-in">
      {/* 页面标题 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">学习计划</h1>
          <p className="text-muted-foreground mt-1">规划今日学习，养成好习惯</p>
        </div>
        <Button onClick={handleCheckIn} className="gradient-bg">
          <CheckCircle className="w-4 h-4 mr-2" />
          今日打卡
        </Button>
      </div>

      {/* 连续打卡统计 */}
      <Card className="bg-gradient-to-r from-emerald-500 to-cyan-500 text-white">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
                <Flame className="w-8 h-8" />
              </div>
              <div>
                <p className="text-4xl font-bold">{user?.streak_days || 0}</p>
                <p className="text-white/80">连续打卡天数</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-medium">保持专注</p>
              <p className="text-white/80">每天进步一点点</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 周视图 */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">本周概览</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={goToPrevWeek}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday}>
                今天
              </Button>
              <Button variant="outline" size="icon" onClick={goToNextWeek}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {weekDates.map((date, index) => {
              const checked = isDateCheckedIn(date);
              const isSelected = isSameDay(date, selectedDate);
              const today = isToday(date);
              
              return (
                <button
                  key={index}
                  onClick={() => setSelectedDate(date)}
                  className={`
                    flex flex-col items-center p-2 rounded-lg transition-all
                    ${isSelected ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}
                    ${today && !isSelected ? 'ring-2 ring-primary ring-offset-2' : ''}
                  `}
                >
                  <span className="text-xs opacity-70">
                    {format(date, 'EEE', { locale: zhCN })}
                  </span>
                  <span className={`text-lg font-bold ${checked && !isSelected ? 'text-emerald-500' : ''}`}>
                    {format(date, 'd')}
                  </span>
                  {checked && (
                    <div className={`w-4 h-4 rounded-full mt-1 ${isSelected ? 'bg-white' : 'bg-emerald-500'}`}>
                      <CheckCircle className={`w-4 h-4 ${isSelected ? 'text-primary' : 'text-white'}`} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 日计划 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" />
              {format(selectedDate, 'yyyy年MM月dd日', { locale: zhCN })}
              {isToday(selectedDate) && <Badge>今天</Badge>}
            </CardTitle>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm">
                  模板
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>使用计划模板</DialogTitle>
                  <DialogDescription>选择一个模板快速开始</DialogDescription>
                </DialogHeader>
                <div className="space-y-2 py-4">
                  {planTemplates.map((template, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="w-full justify-start text-left h-auto py-3 whitespace-pre-wrap"
                      onClick={() => {
                        applyTemplate(template);
                      }}
                    >
                      {template}
                    </Button>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>今日学习计划</Label>
              <Textarea
                placeholder="制定今天的学习计划..."
                className="min-h-[200px] resize-none"
                value={planContent}
                onChange={(e) => setPlanContent(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPlanContent('')}>
                清空
              </Button>
              <Button className="gradient-bg" onClick={savePlan} disabled={saving}>
                {saving ? '保存中...' : '保存计划'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 打卡日历 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">打卡日历</CardTitle>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && setSelectedDate(date)}
            className="mx-auto"
            locale={zhCN}
            modifiers={{
              checked: checkIns.map(c => new Date(c.date))
            }}
            modifiersClassNames={{
              checked: 'bg-emerald-500 text-white hover:bg-emerald-500'
            }}
          />
          <div className="mt-4 text-center text-sm text-muted-foreground">
            <p>绿色标记表示已打卡</p>
            <p>保持连续打卡，培养学习习惯</p>
          </div>
        </CardContent>
      </Card>

      {/* 学习提示 */}
      <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <Flame className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="font-medium text-blue-600 dark:text-blue-400">坚持就是胜利</p>
              <p className="text-sm text-muted-foreground mt-1">
                每天完成学习计划并打卡，21天养成好习惯。连续打卡天数越多，学习动力越强！
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
