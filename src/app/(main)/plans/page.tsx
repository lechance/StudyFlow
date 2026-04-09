'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/lib/i18n';
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
import { Calendar as CalendarIcon, CheckCircle, Flame, ChevronLeft, ChevronRight } from 'lucide-react';

export default function PlansPage() {
  const { user, refreshUser } = useAuth();
  const { t, language } = useLanguage();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [weekDates, setWeekDates] = useState<Date[]>([]);
  const [planContent, setPlanContent] = useState('');
  const [dailyPlan, setDailyPlan] = useState<any>(null);
  const [checkIns, setCheckIns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Generate week dates
  const generateWeekDates = useCallback((centerDate: Date) => {
    const dates: Date[] = [];
    for (let i = -3; i <= 3; i++) {
      dates.push(addDays(centerDate, i));
    }
    return dates;
  }, []);

  // Load week view data
  const loadWeekData = useCallback(async (dates: Date[]) => {
    if (!dates.length) return;
    
    const res = await plansApi.getCheckIns(7);
    if (res.success) {
      setCheckIns(res.data?.checkIns || []);
    }
  }, []);

  // Load daily plan
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

  // Save plan
  const savePlan = async () => {
    if (!planContent.trim()) {
      toast.error(t('plans.pleaseEnterPlan'));
      return;
    }

    setSaving(true);
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const res = await plansApi.savePlan(dateStr, planContent);
    
    if (res.success) {
      setDailyPlan(res.data);
      toast.success(t('plans.planSaved'));
    } else {
      toast.error(t('common.error'));
    }
    setSaving(false);
  };

  // Check in
  const handleCheckIn = async () => {
    const res = await plansApi.checkIn();
    if (res.success) {
      await refreshUser();
      await loadWeekData(weekDates);
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
    setSelectedDate(subDays(selectedDate, 7));
  };

  const goToNextWeek = () => {
    setSelectedDate(addDays(selectedDate, 7));
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  // Check if date is checked in
  const isDateCheckedIn = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return checkIns.some(c => c.date === dateStr);
  };

  // Plan templates
  const planTemplates = [
    t('plans.templates.study'),
    t('plans.templates.preview'),
    t('plans.templates.morning'),
  ];

  const applyTemplate = (template: string) => {
    setPlanContent(template);
  };

  return (
    <div className="space-y-6 animate-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{t('plans.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('plans.subtitle')}</p>
        </div>
        <Button onClick={handleCheckIn} className="gradient-bg">
          <CheckCircle className="w-4 h-4 mr-2" />
          {t('plans.checkIn')}
        </Button>
      </div>

      {/* Streak Stats */}
      <Card className="bg-gradient-to-r from-emerald-500 to-cyan-500 text-white">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
                <Flame className="w-8 h-8" />
              </div>
              <div>
                <p className="text-4xl font-bold">{user?.streak_days || 0}</p>
                <p className="text-white/80">{t('plans.streakTitle')}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-medium">{t('plans.keepFocus')}</p>
              <p className="text-white/80">{t('plans.smallProgress')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Week View */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{t('plans.weekOverview')}</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={goToPrevWeek}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday}>
                {t('plans.today')}
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
                    {format(date, 'EEE')}
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

      {/* Daily Plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" />
              {format(selectedDate, language === 'zh-CN' ? 'yyyy年MM月dd日' : 'MMMM d, yyyy')}
              {isToday(selectedDate) && <Badge>{t('plans.today')}</Badge>}
            </CardTitle>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm">
                  {t('plans.templates')}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('plans.templates')}</DialogTitle>
                  <DialogDescription>
                    {t('common.planningTip')}
                  </DialogDescription>
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
              <Label>{t('plans.dailyPlan')}</Label>
              <Textarea
                placeholder={t('plans.enterPlan')}
                className="min-h-[200px] resize-none"
                value={planContent}
                onChange={(e) => setPlanContent(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPlanContent('')}>
                {t('plans.clear')}
              </Button>
              <Button className="gradient-bg" onClick={savePlan} disabled={saving}>
                {saving ? t('plans.saving') : t('plans.savePlan')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Check-in Calendar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('plans.calendar')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && setSelectedDate(date)}
            className="mx-auto"
            locale={language === 'zh-CN' ? undefined : undefined}
            modifiers={{
              checked: checkIns.map(c => new Date(c.date))
            }}
            modifiersClassNames={{
              checked: 'bg-emerald-500 text-white hover:bg-emerald-500'
            }}
          />
          <div className="mt-4 text-center text-sm text-muted-foreground">
            <p>{t('plans.checkedDays')}</p>
            <p>{t('plans.maintainStreak')}</p>
          </div>
        </CardContent>
      </Card>

      {/* Study Tip */}
      <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <Flame className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="font-medium text-blue-600 dark:text-blue-400">{t('plans.persistWins')}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {t('plans.persistTip')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
