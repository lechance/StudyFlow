'use client';

import { useState, useMemo, useTransition, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTasks } from '@/hooks/useTasks';
import { useLanguage } from '@/lib/i18n';
import type { Task } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AddTaskForm } from '@/components/AddTaskForm';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Plus,
  Trash2,
  Edit2,
  Calendar,
  Clock,
  CheckCircle2,
  Circle,
  PlayCircle,
  Sparkles,
  ListTodo,
  Pin,
  PinOff,
  Target,
  AlertCircle,
  CalendarDays,
  Timer
} from 'lucide-react';
import { tasksApi } from '@/lib/api';
import { format, differenceInDays, isPast, isToday, isTomorrow, addDays } from 'date-fns';
import { toast } from 'sonner';

const PRIORITY_CONFIG: Record<string, { labelKey: string; textColor: string; bgColor: string }> = {
  high: { labelKey: 'priority.high', textColor: 'text-red-600', bgColor: 'bg-red-50 dark:bg-red-950/30' },
  medium: { labelKey: 'priority.medium', textColor: 'text-yellow-600', bgColor: 'bg-yellow-50 dark:bg-yellow-950/30' },
  low: { labelKey: 'priority.low', textColor: 'text-green-600', bgColor: 'bg-green-50 dark:bg-green-950/30' },
};

type ViewTab = 'today' | 'week' | 'all';

// Extract getDeadlineInfo outside component to avoid recreation on every render
const getDeadlineInfo = (task: Task, t: (key: string, opts?: Record<string, string | number>) => string) => {
  const deadline = task.deadline || task.plan_date;
  if (!deadline) return null;
  
  const deadlineDate = new Date(deadline);
  const isTodayDate = isToday(deadlineDate);
  const isTomorrowDate = isTomorrow(deadlineDate);
  const isPastDate = isPast(deadlineDate);
  const days = differenceInDays(deadlineDate, new Date());
  
  if (isPastDate && !isTodayDate) {
    return { 
      text: t('tasks.overdue', { days: Math.abs(days) }), 
      color: 'text-red-600 bg-red-50 dark:bg-red-950/30',
      borderColor: 'border-red-300',
      urgent: true,
      icon: <AlertCircle className="w-3 h-3" />
    };
  }
  if (isTodayDate) {
    return { 
      text: t('tasks.today'),
      color: 'text-orange-600 bg-orange-50 dark:bg-orange-950/30',
      borderColor: 'border-orange-300',
      urgent: true,
      icon: <Clock className="w-3 h-3" />
    };
  }
  if (isTomorrowDate) {
    return { 
      text: t('tasks.tomorrow'),
      color: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30',
      borderColor: 'border-yellow-300',
      urgent: false,
      icon: <Calendar className="w-3 h-3" />
    };
  }
  if (days <= 3) {
    return { 
      text: t('tasks.daysLeft', { days }), 
      color: 'text-orange-600 bg-orange-50 dark:bg-orange-950/30',
      borderColor: 'border-orange-300',
      urgent: true,
      icon: <Clock className="w-3 h-3" />
    };
  }
  return { 
    text: format(deadlineDate, 'MM/dd'),
    color: 'text-muted-foreground bg-muted/50',
    borderColor: 'border-muted',
    urgent: false,
    icon: <Calendar className="w-3 h-3" />
  };
};

export default function TasksPage() {
  const router = useRouter();
  const { tasks, loading, addTask, updateTask, deleteTask, fetchTasks } = useTasks();
  const { t } = useLanguage();
  
  // View state
  const [activeTab, setActiveTab] = useState<ViewTab>('today');
  
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<Partial<Task> | null>(null);
  const [planningTaskId, setPlanningTaskId] = useState<string | null>(null);
  const [selectedPlanDate, setSelectedPlanDate] = useState<string>('');
  
  // Use transition for dialog state updates to prevent UI blocking
  const [isPending, startAddDialogTransition] = useTransition();
  const [, startEditDialogTransition] = useTransition();
  const [, startPlanDialogTransition] = useTransition();

  // Category keys (for edit form)
  const categoryKeys = ['study', 'work', 'reading', 'exercise', 'other'];

  // Today's date string
  const todayStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

  // Filter tasks by plan_date (exclude completed tasks)
  const todayTasks = useMemo(() => {
    return tasks.filter(task => task.plan_date === todayStr && task.status !== 'completed');
  }, [tasks, todayStr]);

  // Week tasks with memoized sorting (exclude completed tasks)
  const weekTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekEnd = addDays(today, 7);
    weekEnd.setHours(23, 59, 59, 999);
    const filtered = tasks.filter(task => {
      if (!task.plan_date || task.status === 'completed') return false;
      const planDate = new Date(task.plan_date);
      planDate.setHours(0, 0, 0, 0);
      return planDate >= today && planDate <= weekEnd;
    });
    // Sort by plan_date once
    return filtered.sort((a, b) => {
      if (!a.plan_date) return 1;
      if (!b.plan_date) return -1;
      return a.plan_date.localeCompare(b.plan_date);
    });
  }, [tasks]);

  // All tasks sorted by priority (exclude completed tasks)
  const sortedAllTasks = useMemo(() => {
    const priorityOrder = { high: 1, medium: 2, low: 3 };
    return tasks
      .filter(task => task.status !== 'completed')
      .sort((a, b) => {
        return priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder];
      });
  }, [tasks]);

  // Filtered tasks based on active tab
  const overallStats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const inProgress = tasks.filter(t => t.status === 'in_progress').length;
    const pending = tasks.filter(t => t.status === 'pending').length;
    const highPriority = tasks.filter(t => t.priority === 'high' && t.status !== 'completed').length;
    
    let subtaskTotal = 0;
    let subtaskCompleted = 0;
    tasks.forEach(task => {
      subtaskTotal += task.subtask_total || 0;
      subtaskCompleted += task.subtask_completed || 0;
    });
    
    return { total, completed, inProgress, pending, highPriority, subtaskTotal, subtaskCompleted };
  }, [tasks]);

  // Get tasks not in any plan (exclude completed tasks)
  const unPlannedTasks = useMemo(() => {
    return tasks.filter(task => !task.plan_date && task.status !== 'completed');
  }, [tasks]);

  // Handle task submission from AddTaskForm
  const handleSubmitTask = useCallback(async (data: {
    title: string;
    category: string;
    priority: 'high' | 'medium' | 'low';
    deadline?: string;
    plan_date?: string;
    estimated_time?: number;
  }): Promise<boolean> => {
    let planDate = data.plan_date;
    if (!planDate && activeTab === 'today') {
      planDate = todayStr;
    }

    const success = await addTask({
      title: data.title,
      category: data.category,
      priority: data.priority,
      deadline: data.deadline,
      plan_date: planDate,
      estimated_time: data.estimated_time,
      status: 'pending'
    });

    if (success) {
      toast.success(t('tasks.taskCreated'));
      setShowAddDialog(false);
      await fetchTasks(true);
      return true;
    }
    return false;
  }, [activeTab, todayStr, addTask, fetchTasks, t]);

  // Quick add task to today or this week
  const handleQuickAddToPlan = async (taskId: string, targetType: 'today' | 'week') => {
    try {
      let planDate = todayStr;
      if (targetType === 'week') {
        for (let i = 0; i <= 7; i++) {
          const checkDate = addDays(new Date(), i);
          const dateStr = format(checkDate, 'yyyy-MM-dd');
          const hasTaskOnDate = weekTasks.some(t => t.plan_date === dateStr);
          if (!hasTaskOnDate) {
            planDate = dateStr;
            break;
          }
        }
      }
      
      const res = await tasksApi.update(taskId, { plan_date: planDate });
      if (res.success) {
        toast.success(targetType === 'today' ? t('tasks.addedToToday') : t('tasks.addedToWeek'));
        await fetchTasks(true);
      }
    } catch {
      toast.error(t('common.error'));
    }
  };

  // Open plan dialog for a specific task
  const handleOpenPlanDialog = (taskId: string) => {
    setPlanningTaskId(taskId);
    setSelectedPlanDate(todayStr);
    setShowPlanDialog(true);
  };

  // Add task to specific date via dialog
  const handleAddToSpecificDate = async () => {
    if (!planningTaskId || !selectedPlanDate) return;
    
    try {
      const res = await tasksApi.update(planningTaskId, { plan_date: selectedPlanDate });
      if (res.success) {
        const formattedDate = format(new Date(selectedPlanDate), 'MM/dd');
        toast.success(t('tasks.dateSelected', { date: formattedDate }));
        setShowPlanDialog(false);
        setPlanningTaskId(null);
        setSelectedPlanDate('');
        await fetchTasks(true);
      }
    } catch {
      toast.error(t('common.error'));
    }
  };

  // Remove from plan
  const handleRemoveFromPlan = async (taskId: string) => {
    try {
      const res = await tasksApi.update(taskId, { plan_date: null });
      if (res.success) {
        toast.success(t('tasks.removedFromPlan'));
        await fetchTasks(true);
      }
    } catch {
      toast.error(t('common.error'));
    }
  };

  const handleUpdateTask = async () => {
    if (!editingTask || !editingTask.id) return;

    const success = await updateTask(editingTask.id, {
      title: editingTask.title,
      category: editingTask.category,
      priority: editingTask.priority,
      deadline: editingTask.deadline || undefined,
      plan_date: editingTask.plan_date || undefined,
      estimated_time: editingTask.estimated_time
    });

    if (success) {
      toast.success(t('tasks.taskUpdated'));
      setShowEditDialog(false);
      setEditingTask(null);
      await fetchTasks(true);
    }
  };

  const handleStatusChange = async (taskId: string, status: 'pending' | 'in_progress' | 'completed') => {
    await updateTask(taskId, { status });
    if (status === 'completed') {
      toast.success(t('common.greatJob'));
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    await deleteTask(taskId);
    toast.success(t('tasks.taskDeleted'));
  };

  // Render task card with detailed info - clickable to view detail
  const renderTaskCard = (task: Task, showPlanInfo: boolean = false, isTodayTask: boolean = false) => {
    const priorityConfig = PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG];
    const hasSubtasks = (task.subtask_total || 0) > 0;
    const subtaskProgress = Math.min(100, task.subtask_progress || 0);
    const deadlineInfo = getDeadlineInfo(task, t);
    const isCompleted = task.status === 'completed';
    const completedSubtasks = task.subtask_completed || 0;
    const totalSubtasks = task.subtask_total || 0;

    // Navigate to task detail page
    const handleCardClick = () => {
      router.push(`/tasks/${task.id}`);
    };

    return (
      <Card
        key={task.id}
        className={`card-hover transition-all cursor-pointer ${isCompleted ? 'opacity-60' : ''} ${
          deadlineInfo?.urgent ? `border ${deadlineInfo.borderColor}` : ''
        }`}
        onClick={handleCardClick}
      >
        <CardContent className={`p-4 ${hasSubtasks ? 'pb-3' : ''}`}>
          {/* Header Row */}
          <div className="flex items-start gap-3">
            <div onClick={(e) => e.stopPropagation()}>
              <Checkbox
                checked={isCompleted}
                onCheckedChange={(checked) => {
                  handleStatusChange(task.id, checked ? 'completed' : 'pending');
                }}
                className="mt-0.5 w-5 h-5"
              />
            </div>
            <div className="flex-1 min-w-0 space-y-3">
              {/* Title Row */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                  {isTodayTask && (
                    <Badge className="bg-primary text-xs shrink-0">{t('tasks.today')}</Badge>
                  )}
                  <span className={`font-semibold text-lg truncate ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                    {task.title}
                  </span>
                </div>
              </div>
              
              {/* Meta Info Row - Compact Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={`${priorityConfig?.textColor} border-current text-xs gap-1`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  {t(priorityConfig?.labelKey || 'priority.medium')}
                </Badge>
                <Badge variant="outline" className="text-xs gap-1">
                  {task.category === 'study' && '📚'}
                  {task.category === 'work' && '💼'}
                  {task.category === 'reading' && '📖'}
                  {task.category === 'exercise' && '🏃'}
                  {task.category === 'other' && '📌'}
                  {t(`category.${task.category}`)}
                </Badge>
                {task.estimated_time && (
                  <Badge variant="outline" className="text-xs gap-1">
                    <Timer className="w-3 h-3" />
                    {task.estimated_time}{t('common.minutes')}
                  </Badge>
                )}
              </div>
              
              {/* Deadline & Plan Info Row */}
              {(deadlineInfo || task.plan_date) && (
                <div className="flex items-center gap-3">
                  {deadlineInfo && (
                    <Badge variant="outline" className={`${deadlineInfo.color} border-current text-xs gap-1 font-normal`}>
                      {deadlineInfo.icon}
                      {t('tasks.deadline')}: {deadlineInfo.text}
                    </Badge>
                  )}
                  {task.plan_date && (
                    <Badge variant="outline" className="text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-700 text-xs gap-1 font-normal">
                      <CalendarDays className="w-3 h-3" />
                      {t('tasks.planDate')}: {format(new Date(task.plan_date), 'MM/dd')}
                    </Badge>
                  )}
                </div>
              )}
            </div>
            
            {/* Quick Actions */}
            <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
              {!task.plan_date && !isCompleted && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleQuickAddToPlan(task.id, 'today');
                    }}
                    title={t('tasks.addToToday')}
                  >
                    <Pin className="w-4 h-4 text-primary" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenPlanDialog(task.id);
                    }}
                    title={t('tasks.selectDate')}
                  >
                    <Calendar className="w-4 h-4 text-primary" />
                  </Button>
                </>
              )}
              {task.plan_date && !isCompleted && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFromPlan(task.id);
                  }}
                  title={t('tasks.removeFromPlan')}
                >
                  <PinOff className="w-4 h-4 text-muted-foreground" />
                </Button>
              )}
              {!isCompleted && task.status !== 'in_progress' && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStatusChange(task.id, 'in_progress');
                  }}
                  title={t('common.startTask')}
                >
                  <PlayCircle className="w-4 h-4 text-cyan-500" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingTask(task);
                  setShowEditDialog(true);
                }}
                title={t('common.edit')}
              >
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteTask(task.id);
                }}
                title={t('common.delete')}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Subtask Progress - At Bottom of Card */}
          {hasSubtasks && (
            <div className="-mx-4 -mb-4 mt-3 px-4 pt-3 pb-3 border-t border-border/50 bg-muted/30 rounded-b-lg">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <ListTodo className="w-3.5 h-3.5" />
                  <span>{t('tasks.subtasks')}: {completedSubtasks}/{totalSubtasks}</span>
                </span>
                <span className={`font-semibold ${subtaskProgress === 100 ? 'text-emerald-600' : 'text-foreground'}`}>
                  {subtaskProgress}%
                </span>
              </div>
              <div className="h-2 bg-muted/70 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-300 ${
                    subtaskProgress === 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-400'
                  }`}
                  style={{ width: `${subtaskProgress}%` }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t('tasks.title')}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{t('tasks.subtitle')}</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={(open) => startAddDialogTransition(() => setShowAddDialog(open))}>
          <DialogTrigger asChild>
            <Button className="gradient-bg">
              <Plus className="w-4 h-4 mr-2" />
              {t('tasks.addTask')}
            </Button>
          </DialogTrigger>
          <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle>{t('tasks.newTask')}</DialogTitle>
              <DialogDescription>
                {t('dashboard.createJourney')}
              </DialogDescription>
            </DialogHeader>
            <AddTaskForm 
              onSubmit={handleSubmitTask}
              onCancel={() => setShowAddDialog(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-3 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Target className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xl font-bold">{overallStats.total}</p>
                <p className="text-xs text-muted-foreground">{t('tasks.total')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-3 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-xl font-bold">{overallStats.completed}</p>
                <p className="text-xs text-muted-foreground">{t('tasks.completed')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-3 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <ListTodo className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-xl font-bold">{overallStats.subtaskTotal > 0 
                  ? `${overallStats.subtaskCompleted}/${overallStats.subtaskTotal}` 
                  : '-'}
                </p>
                <p className="text-xs text-muted-foreground">{t('tasks.subtasks')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-3 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-xl font-bold">{overallStats.highPriority}</p>
                <p className="text-xs text-muted-foreground">{t('tasks.highPriority')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation */}
      <Tabs defaultValue="today" value={activeTab} onValueChange={(v) => setActiveTab(v as ViewTab)}>
        <TabsList className="grid w-full max-w-[480px] grid-cols-3 bg-muted/50 p-1 rounded-lg">
          <TabsTrigger value="today" className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md transition-all">
            <Calendar className="w-4 h-4" />
            {t('tasks.todayPlan')}
          </TabsTrigger>
          <TabsTrigger value="week" className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md transition-all">
            <CalendarDays className="w-4 h-4" />
            {t('tasks.weekPlan')}
          </TabsTrigger>
          <TabsTrigger value="all" className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md transition-all">
            <Sparkles className="w-4 h-4" />
            {t('tasks.allTasks')}
          </TabsTrigger>
        </TabsList>

        {/* Today Plan Tab */}
        <TabsContent value="today" className="space-y-3 mt-3">
          {/* Today's Tasks */}
          <div className="space-y-2.5">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <ListTodo className="w-5 h-5" />
              {t('tasks.todayTasks')} ({todayTasks.length})
            </h3>
            
            {todayTasks.length === 0 ? (
              <Card className="py-8">
                <CardContent className="text-center text-muted-foreground">
                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>{t('tasks.noTodayTasks')}</p>
                  <p className="text-sm">{t('tasks.addTodayTask')}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {todayTasks.map((task) => renderTaskCard(task, true, true))}
              </div>
            )}
          </div>

          {/* Quick Add Section */}
          {unPlannedTasks.length > 0 && (
            <Card className="border-dashed border-2 bg-muted/20 mt-3">
              <CardHeader className="pb-2 pt-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  {t('tasks.quickAddToPlan')} ({unPlannedTasks.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {unPlannedTasks.slice(0, 5).map((task) => {
                  const priorityConfig = PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG];
                  return (
                    <div 
                      key={task.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-card border hover:shadow-sm transition-shadow"
                    >
                      <Circle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="font-medium truncate block">{task.title}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className={`${priorityConfig?.textColor} border-current text-xs py-0`}>
                            {t(priorityConfig?.labelKey || 'priority.medium')}
                          </Badge>
                          {(task.subtask_total || 0) > 0 && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <ListTodo className="w-3 h-3" />
                              {task.subtask_completed || 0}/{task.subtask_total || 0}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex items-center gap-1 flex-shrink-0"
                        onClick={() => handleQuickAddToPlan(task.id, 'today')}
                      >
                        <Pin className="w-3 h-3" />
                        {t('tasks.addToToday')}
                      </Button>
                    </div>
                  );
                })}
                {unPlannedTasks.length > 5 && (
                  <p className="text-center text-sm text-muted-foreground py-2">
                    +{unPlannedTasks.length - 5} {t('tasks.moreTasks')}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Week Plan Tab */}
        <TabsContent value="week" className="space-y-3 mt-3">
          {/* Week Tasks List */}
          <div className="space-y-2.5">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <CalendarDays className="w-5 h-5" />
              {t('tasks.weekTasks')} ({weekTasks.length})
            </h3>
            
            {weekTasks.length === 0 ? (
              <Card className="py-8">
                <CardContent className="text-center text-muted-foreground">
                  <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>{t('tasks.noWeekTasks')}</p>
                  <p className="text-sm">{t('tasks.addWeekTask')}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {weekTasks.map((task) => renderTaskCard(task, true, task.plan_date === todayStr))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* All Tasks Tab */}
        <TabsContent value="all" className="space-y-4 mt-4">
          {/* Quick Add Section */}
          {unPlannedTasks.length > 0 && (
            <Card className="border-dashed border-2 bg-muted/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  {t('tasks.unplannedTasks')} ({unPlannedTasks.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {unPlannedTasks.slice(0, 5).map((task) => {
                  const priorityConfig = PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG];
                  const deadlineInfo = getDeadlineInfo(task, t);
                  return (
                    <div 
                      key={task.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-card border hover:shadow-sm transition-shadow"
                    >
                      <Circle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="font-medium truncate block">{task.title}</span>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge variant="outline" className={`${priorityConfig?.textColor} border-current text-xs py-0`}>
                            {t(priorityConfig?.labelKey || 'priority.medium')}
                          </Badge>
                          {deadlineInfo && (
                            <span className={`text-xs px-1.5 py-0.5 rounded ${deadlineInfo.color}`}>
                              {deadlineInfo.text}
                            </span>
                          )}
                          {(task.subtask_total || 0) > 0 && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <ListTodo className="w-3 h-3" />
                              {task.subtask_completed || 0}/{task.subtask_total || 0}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex items-center gap-1"
                          onClick={() => handleQuickAddToPlan(task.id, 'today')}
                        >
                          <Pin className="w-3 h-3" />
                          {t('tasks.addToToday')}
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {unPlannedTasks.length > 5 && (
                  <p className="text-center text-sm text-muted-foreground py-2">
                    +{unPlannedTasks.length - 5} {t('tasks.moreTasks')}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* All Tasks */}
          <div className="space-y-2.5">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              {t('tasks.allTasks')} ({tasks.length})
            </h3>
            
            {tasks.length === 0 ? (
              <Card className="py-12">
                <CardContent className="text-center">
                  <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-lg font-medium">{t('tasks.noTasks')}</p>
                  <p className="text-sm text-muted-foreground mt-1">{t('tasks.addFirst')}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {sortedAllTasks.map((task) => renderTaskCard(task, true, task.plan_date === todayStr))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>


      {/* Edit Task Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => startEditDialogTransition(() => setShowEditDialog(open))}>
        <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{t('tasks.editTask')}</DialogTitle>
          </DialogHeader>
          {editingTask && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{t('tasks.taskName')} *</Label>
                <Input
                  value={editingTask.title}
                  onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('tasks.category')}</Label>
                  <Select value={editingTask.category} onValueChange={(v) => setEditingTask({ ...editingTask, category: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryKeys.map((key) => (
                        <SelectItem key={key} value={key}>{t(`category.${key}`)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('tasks.priority')}</Label>
                  <Select value={editingTask.priority} onValueChange={(v) => setEditingTask({ ...editingTask, priority: v as 'high' | 'medium' | 'low' })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">{t('priority.high')}</SelectItem>
                      <SelectItem value="medium">{t('priority.medium')}</SelectItem>
                      <SelectItem value="low">{t('priority.low')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('tasks.planDate')}</Label>
                  <Input
                    type="date"
                    value={editingTask.plan_date || ''}
                    onChange={(e) => setEditingTask({ ...editingTask, plan_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('tasks.deadline')}</Label>
                  <Input
                    type="date"
                    value={editingTask.deadline || ''}
                    onChange={(e) => setEditingTask({ ...editingTask, deadline: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('tasks.estimatedTime')}</Label>
                <Input
                  type="number"
                  min="1"
                  value={editingTask.estimated_time || ''}
                  onChange={(e) => setEditingTask({ ...editingTask, estimated_time: e.target.value ? parseInt(e.target.value) : undefined })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>{t('common.cancel')}</Button>
            <Button className="gradient-bg" onClick={handleUpdateTask}>{t('common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add to Plan Dialog */}
      <Dialog open={showPlanDialog} onOpenChange={(open) => startPlanDialogTransition(() => setShowPlanDialog(open))}>
        <DialogContent onOpenAutoFocus={(e) => e.preventDefault()} className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t('tasks.selectDateTitle')}</DialogTitle>
            <DialogDescription>
              {t('tasks.addToSpecificDate')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Quick select buttons */}
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedPlanDate(todayStr)}
                className={selectedPlanDate === todayStr ? 'bg-primary text-primary-foreground' : ''}
              >
                {t('tasks.today')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedPlanDate(format(addDays(new Date(), 1), 'yyyy-MM-dd'))}
                className={selectedPlanDate === format(addDays(new Date(), 1), 'yyyy-MM-dd') ? 'bg-primary text-primary-foreground' : ''}
              >
                {t('tasks.tomorrow')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedPlanDate(format(addDays(new Date(), 3), 'yyyy-MM-dd'))}
                className={selectedPlanDate === format(addDays(new Date(), 3), 'yyyy-MM-dd') ? 'bg-primary text-primary-foreground' : ''}
              >
                {format(addDays(new Date(), 3), 'MM/dd')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedPlanDate(format(addDays(new Date(), 5), 'yyyy-MM-dd'))}
                className={selectedPlanDate === format(addDays(new Date(), 5), 'yyyy-MM-dd') ? 'bg-primary text-primary-foreground' : ''}
              >
                {format(addDays(new Date(), 5), 'MM/dd')}
              </Button>
            </div>
            
            {/* Date picker */}
            <div className="space-y-2">
              <Label>{t('tasks.pickDate')}</Label>
              <Input
                type="date"
                value={selectedPlanDate}
                onChange={(e) => setSelectedPlanDate(e.target.value)}
                min={todayStr}
              />
            </div>
            
            {/* Selected date preview */}
            {selectedPlanDate && (
              <div className="p-3 rounded-lg bg-muted/50 text-sm">
                <p className="text-muted-foreground">{t('tasks.selectedDate')}:</p>
                <p className="font-medium text-lg">
                  {format(new Date(selectedPlanDate), 'yyyy年MM月dd日')}
                  {selectedPlanDate === todayStr && ` (${t('tasks.today')})`}
                  {selectedPlanDate === format(addDays(new Date(), 1), 'yyyy-MM-dd') && ` (${t('tasks.tomorrow')})`}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPlanDialog(false)}>{t('common.cancel')}</Button>
            <Button 
              className="gradient-bg" 
              onClick={handleAddToSpecificDate}
              disabled={!selectedPlanDate}
            >
              {t('tasks.addToPlan')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
