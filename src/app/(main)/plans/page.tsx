'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { plansApi, studyApi, tasksApi } from '@/lib/api';
import { toast } from 'sonner';
import { format, addDays, subDays, isToday, isSameDay, startOfWeek, endOfWeek } from 'date-fns';
import { 
  Calendar, 
  CheckCircle, 
  Flame, 
  ChevronLeft, 
  ChevronRight,
  Target,
  ListTodo,
  TrendingUp,
  Clock,
  Sparkles
} from 'lucide-react';

export default function PlansPage() {
  const { user, refreshUser } = useAuth();
  const { t, language } = useLanguage();
  const [checkIns, setCheckIns] = useState<any[]>([]);
  const [todayTasks, setTodayTasks] = useState<any[]>([]);
  const [weekStats, setWeekStats] = useState<any>(null);
  const [weekDates, setWeekDates] = useState<Date[]>([]);
  const [loading, setLoading] = useState(false);

  // Generate week dates centered around today
  const generateWeekDates = useCallback((centerDate: Date) => {
    const dates: Date[] = [];
    for (let i = -3; i <= 3; i++) {
      dates.push(addDays(centerDate, i));
    }
    return dates;
  }, []);

  // Load check-in data
  const loadCheckIns = useCallback(async () => {
    const res = await plansApi.getCheckIns(14);
    if (res.success) {
      setCheckIns(res.data?.checkIns || []);
    }
  }, []);

  // Load today's tasks from Tasks system
  const loadTodayTasks = useCallback(async () => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const res = await tasksApi.getAll(false, { planDate: todayStr });
    if (res.success) {
      setTodayTasks(res.data || []);
    }
  }, []);

  // Load week stats from study records
  const loadWeekStats = useCallback(async () => {
    const today = new Date();
    const weekStart = startOfWeek(today);
    const weekEnd = endOfWeek(today);
    
    try {
      const res = await studyApi.getRecords({
        startDate: format(weekStart, 'yyyy-MM-dd'),
        endDate: format(weekEnd, 'yyyy-MM-dd')
      });
      
      if (res.success && res.data) {
        // Calculate stats from study records
        const totalMinutes = res.data.reduce((sum: number, r: any) => sum + (r.duration || 0), 0);
        setWeekStats({
          studyHours: Math.round(totalMinutes / 60 * 10) / 10,
          completedTasks: todayTasks.filter(t => t.status === 'completed').length
        });
      }
    } catch (error) {
      console.error('Failed to load week stats:', error);
      setWeekStats({ studyHours: 0, completedTasks: 0 });
    }
  }, [todayTasks]);

  useEffect(() => {
    setWeekDates(generateWeekDates(new Date()));
  }, [generateWeekDates]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        loadCheckIns(),
        loadTodayTasks()
      ]);
      setLoading(false);
    };
    loadData();
  }, [loadCheckIns, loadTodayTasks]);

  useEffect(() => {
    if (todayTasks.length > 0) {
      loadWeekStats();
    }
  }, [todayTasks, loadWeekStats]);

  // Check in
  const handleCheckIn = async () => {
    const res = await plansApi.checkIn();
    if (res.success) {
      await refreshUser();
      await loadCheckIns();
      if (res.data?.newStreak) {
        toast.success(t('plans.checkInStreak', { days: res.data.newStreak }));
      } else {
        toast.success(t('plans.checkInSuccess'));
      }
    } else {
      toast.error(res.error || t('plans.checkinFailed'));
    }
  };

  // Week navigation
  const goToPrevWeek = () => {
    const newCenter = subDays(weekDates[0], 1);
    setWeekDates(generateWeekDates(newCenter));
  };

  const goToNextWeek = () => {
    const newCenter = addDays(weekDates[6], 1);
    setWeekDates(generateWeekDates(newCenter));
  };

  const goToToday = () => {
    setWeekDates(generateWeekDates(new Date()));
  };

  // Check if date is checked in
  const isDateCheckedIn = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return checkIns.some(c => c.date === dateStr);
  };

  // Calculate stats
  const todayCompleted = todayTasks.filter(t => t.status === 'completed').length;
  const todayProgress = todayTasks.length > 0 ? Math.round((todayCompleted / todayTasks.length) * 100) : 0;
  
  const todayCheckIn = isToday(weekDates[3]) ? isDateCheckedIn(weekDates[3]) : false;
  
  // Week check-in count
  const weekCheckInCount = weekDates.filter(d => isDateCheckedIn(d) && d <= new Date()).length;

  return (
    <div className="space-y-6 animate-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{t('checkin.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('checkin.subtitle')}</p>
        </div>
        <Button 
          onClick={handleCheckIn} 
          className={todayCheckIn ? 'bg-emerald-500 hover:bg-emerald-600' : 'gradient-bg'}
          disabled={todayCheckIn}
        >
          {todayCheckIn ? (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              {t('checkin.alreadyCheckedIn')}
            </>
          ) : (
            <>
              <Flame className="w-4 h-4 mr-2" />
              {t('checkin.checkInNow')}
            </>
          )}
        </Button>
      </div>

      {/* Streak Stats Card */}
      <Card className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                <Flame className="w-10 h-10" />
              </div>
              <div>
                <p className="text-5xl font-bold">{user?.streak_days || 0}</p>
                <p className="text-white/80 text-lg">{t('checkin.streakDays')}</p>
              </div>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-lg font-medium">{t('checkin.keepGoing')}</p>
              <p className="text-white/80">{t('checkin.smallProgress')}</p>
              <p className="text-sm text-white/60 mt-2">
                {user?.streak_days && user.streak_days >= 7 
                  ? t('checkin.greatStreak') 
                  : user?.streak_days && user.streak_days >= 21 
                    ? t('checkin.amazingStreak') 
                    : t('checkin.startStreak')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Today's Progress */}
      <Card className="border-emerald-200 dark:border-emerald-800">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="w-5 h-5 text-emerald-500" />
              {t('checkin.todayProgress')}
            </CardTitle>
            <Badge variant="outline" className="text-emerald-500 border-emerald-200">
              {todayCompleted}/{todayTasks.length} {t('checkin.tasksCompleted')}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Progress value={todayProgress} className="h-4 flex-1" />
            <span className="text-2xl font-bold text-emerald-500 w-16 text-right">
              {todayProgress}%
            </span>
          </div>
          <div className="mt-4 space-y-2">
            {todayTasks.slice(0, 5).map((task) => (
              <div 
                key={task.id}
                className={`flex items-center gap-3 p-2 rounded-lg ${
                  task.status === 'completed' 
                    ? 'bg-emerald-50 dark:bg-emerald-950/30' 
                    : 'bg-muted/50'
                }`}
              >
                {task.status === 'completed' ? (
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-muted-foreground flex-shrink-0" />
                )}
                <span className={`flex-1 truncate ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                  {task.title}
                </span>
              </div>
            ))}
            {todayTasks.length > 5 && (
              <p className="text-sm text-muted-foreground text-center">
                +{todayTasks.length - 5} {t('checkin.moreTasks')}
              </p>
            )}
            {todayTasks.length === 0 && (
              <div className="text-center py-4 text-muted-foreground">
                <ListTodo className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>{t('checkin.noTasksToday')}</p>
                <p className="text-sm">{t('checkin.addTasksFromTasksPage')}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Week Overview */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              {t('checkin.weekOverview')}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={goToPrevWeek}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday}>
                {t('checkin.today')}
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
              const isTodayDate = isToday(date);
              const isFuture = date > new Date();
              
              return (
                <div
                  key={index}
                  className={`
                    flex flex-col items-center p-3 rounded-lg transition-all
                    ${isTodayDate ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2' : ''}
                    ${checked && !isTodayDate ? 'bg-emerald-100 dark:bg-emerald-900/50' : ''}
                    ${!checked && !isTodayDate && !isFuture ? 'bg-muted/50' : ''}
                    ${isFuture ? 'opacity-50' : ''}
                  `}
                >
                  <span className={`text-xs ${isTodayDate ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                    {format(date, 'EEE')}
                  </span>
                  <span className={`text-lg font-bold ${checked && !isTodayDate ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                    {format(date, 'd')}
                  </span>
                  {checked && (
                    <CheckCircle className={`w-5 h-5 mt-1 ${isTodayDate ? 'text-primary-foreground' : 'text-emerald-500'}`} />
                  )}
                  {!checked && !isFuture && (
                    <div className={`w-5 h-5 rounded-full border-2 mt-1 ${isTodayDate ? 'border-primary-foreground/50' : 'border-muted-foreground/30'}`} />
                  )}
                </div>
              );
            })}
          </div>
          
          {/* Week Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="flex items-center justify-center gap-2 text-amber-500">
                <Flame className="w-4 h-4" />
                <span className="text-2xl font-bold">{weekCheckInCount}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{t('checkin.weekCheckins')}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="flex items-center justify-center gap-2 text-blue-500">
                <TrendingUp className="w-4 h-4" />
                <span className="text-2xl font-bold">{weekStats?.completedTasks || 0}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{t('checkin.weekTasks')}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="flex items-center justify-center gap-2 text-purple-500">
                <Clock className="w-4 h-4" />
                <span className="text-2xl font-bold">{weekStats?.studyHours || 0}h</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{t('checkin.weekHours')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Motivation Card */}
      <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-600 dark:text-blue-400">{t('checkin.motivationTitle')}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {user?.streak_days && user.streak_days >= 21 
                  ? t('checkin.motivationExpert')
                  : user?.streak_days && user.streak_days >= 7 
                    ? t('checkin.motivationGreat')
                    : t('checkin.motivationStart')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
