'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTasks } from '@/hooks/useTasks';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
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
  X,
  Pin,
  PinOff,
  Target,
  ChevronRight,
  AlertCircle,
  CalendarDays,
  Timer
} from 'lucide-react';
import { api } from '@/lib/api';
import { tasksApi } from '@/lib/api';
import { format, differenceInDays, isPast, isToday, isTomorrow, addDays } from 'date-fns';
import { toast } from 'sonner';

const PRIORITY_CONFIG: Record<string, { labelKey: string; textColor: string; bgColor: string }> = {
  high: { labelKey: 'priority.high', textColor: 'text-red-600', bgColor: 'bg-red-50 dark:bg-red-950/30' },
  medium: { labelKey: 'priority.medium', textColor: 'text-yellow-600', bgColor: 'bg-yellow-50 dark:bg-yellow-950/30' },
  low: { labelKey: 'priority.low', textColor: 'text-green-600', bgColor: 'bg-green-50 dark:bg-green-950/30' },
};

type ViewTab = 'today' | 'week' | 'all';

export default function TasksPage() {
  const router = useRouter();
  const { tasks, loading, addTask, updateTask, deleteTask, clearCompleted, fetchTasks } = useTasks();
  const { t } = useLanguage();
  
  // View state
  const [activeTab, setActiveTab] = useState<ViewTab>('today');
  
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [planningTaskId, setPlanningTaskId] = useState<string | null>(null);
  const [selectedPlanDate, setSelectedPlanDate] = useState<string>('');
  
  // New task form
  const [newTask, setNewTask] = useState({
    title: '',
    category: 'study',
    priority: 'medium',
    deadline: '',
    plan_date: '',
    estimated_time: ''
  });

  // Category keys
  const categoryKeys = ['study', 'work', 'reading', 'exercise', 'other'];

  // Today's date string
  const todayStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

  // Filter tasks by plan_date
  const todayTasks = useMemo(() => {
    return tasks.filter(task => task.plan_date === todayStr);
  }, [tasks, todayStr]);

  const weekTasks = useMemo(() => {
    const today = new Date();
    const weekEnd = addDays(today, 7);
    return tasks.filter(task => {
      if (!task.plan_date) return false;
      const planDate = new Date(task.plan_date);
      return planDate >= today && planDate <= weekEnd;
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

  // Get tasks not in any plan
  const unPlannedTasks = useMemo(() => {
    return tasks.filter(task => !task.plan_date && task.status !== 'completed');
  }, [tasks]);

  const handleAddTask = async () => {
    if (!newTask.title.trim()) {
      toast.error(t('tasks.taskName') + ' ' + t('common.required'));
      return;
    }

    let planDate = newTask.plan_date;
    if (!planDate) {
      if (activeTab === 'today') planDate = todayStr;
    }

    const success = await addTask({
      title: newTask.title,
      category: newTask.category,
      priority: newTask.priority as 'high' | 'medium' | 'low',
      deadline: newTask.deadline || undefined,
      plan_date: planDate || undefined,
      estimated_time: newTask.estimated_time ? parseInt(newTask.estimated_time) : undefined,
      status: 'pending'
    });

    if (success) {
      toast.success(t('tasks.taskCreated'));
      setShowAddDialog(false);
      setNewTask({ 
        title: '', 
        category: 'study', 
        priority: 'medium', 
        deadline: '', 
        plan_date: '',
        estimated_time: '' 
      });
      await fetchTasks();
    }
  };

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
        await fetchTasks();
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
        await fetchTasks();
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
        await fetchTasks();
      }
    } catch {
      toast.error(t('common.error'));
    }
  };

  const handleUpdateTask = async () => {
    if (!editingTask) return;

    const success = await updateTask(editingTask.id, {
      title: editingTask.title,
      category: editingTask.category,
      priority: editingTask.priority,
      deadline: editingTask.deadline || undefined,
      plan_date: editingTask.plan_date || undefined,
      estimated_time: editingTask.estimated_time ? parseInt(editingTask.estimated_time) : undefined
    });

    if (success) {
      toast.success(t('tasks.taskUpdated'));
      setShowEditDialog(false);
      setEditingTask(null);
      await fetchTasks();
    }
  };

  const handleStatusChange = async (taskId: string, status: 'pending' | 'in_progress' | 'completed') => {
    await updateTask(taskId, { status });
    if (status === 'completed') {
      toast.success(t('common.greatJob'));
    }
    await fetchTasks();
  };

  const handleDeleteTask = async (taskId: string) => {
    await deleteTask(taskId);
    toast.success(t('tasks.taskDeleted'));
    await fetchTasks();
  };

  const handleClearCompleted = async () => {
    const completedIds = tasks.filter(t => t.status === 'completed').map(t => t.id);
    await clearCompleted(completedIds);
    setShowClearDialog(false);
    toast.success(t('tasks.cleared'));
    await fetchTasks();
  };

  // Get deadline info
  const getDeadlineInfo = (task: any) => {
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

  // Render task card with detailed info - clickable to view detail
  const renderTaskCard = (task: any, showPlanInfo: boolean = false, isTodayTask: boolean = false) => {
    const priorityConfig = PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG];
    const hasSubtasks = (task.subtask_total || 0) > 0;
    const subtaskProgress = Math.min(100, task.subtask_progress || 0);
    const deadlineInfo = getDeadlineInfo(task);
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
                    onClick={() => handleQuickAddToPlan(task.id, 'today')}
                    title={t('tasks.addToToday')}
                  >
                    <Pin className="w-4 h-4 text-primary" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleOpenPlanDialog(task.id)}
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
                  onClick={() => handleRemoveFromPlan(task.id)}
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
                  onClick={() => handleStatusChange(task.id, 'in_progress')}
                  title={t('common.startTask')}
                >
                  <PlayCircle className="w-4 h-4 text-cyan-500" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
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
                onClick={() => handleDeleteTask(task.id)}
                title={t('common.delete')}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Subtask Progress - At Bottom of Card */}
          {hasSubtasks && (
            <div className="-mx-4 -mb-4 mt-5 px-4 pt-4 pb-3 border-t border-border/50 bg-muted/30 rounded-b-lg">
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
    <div className="space-y-6 animate-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{t('tasks.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('tasks.subtitle')}</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="gradient-bg">
              <Plus className="w-4 h-4 mr-2" />
              {t('tasks.addTask')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('tasks.newTask')}</DialogTitle>
              <DialogDescription>
                {t('dashboard.createJourney')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{t('tasks.taskName')} *</Label>
                <Input
                  placeholder={t('common.enterTaskName')}
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('tasks.category')}</Label>
                  <Select value={newTask.category} onValueChange={(v) => setNewTask({ ...newTask, category: v })}>
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
                  <Select value={newTask.priority} onValueChange={(v) => setNewTask({ ...newTask, priority: v })}>
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
                    value={newTask.plan_date}
                    onChange={(e) => setNewTask({ ...newTask, plan_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('tasks.deadline')}</Label>
                  <Input
                    type="date"
                    value={newTask.deadline}
                    onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('tasks.estimatedTime')}</Label>
                <Input
                  type="number"
                  placeholder="30"
                  min="1"
                  value={newTask.estimated_time}
                  onChange={(e) => setNewTask({ ...newTask, estimated_time: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>{t('common.cancel')}</Button>
              <Button className="gradient-bg" onClick={handleAddTask}>{t('tasks.createTask')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Target className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{overallStats.total}</p>
                <p className="text-xs text-muted-foreground">{t('tasks.total')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{overallStats.completed}</p>
                <p className="text-xs text-muted-foreground">{t('tasks.completed')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <ListTodo className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{overallStats.subtaskTotal > 0 
                  ? `${overallStats.subtaskCompleted}/${overallStats.subtaskTotal}` 
                  : '-'}
                </p>
                <p className="text-xs text-muted-foreground">{t('tasks.subtasks')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-red-500/20 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{overallStats.highPriority}</p>
                <p className="text-xs text-muted-foreground">{t('tasks.highPriority')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation */}
      <Tabs defaultValue="today" value={activeTab} onValueChange={(v) => setActiveTab(v as ViewTab)}>
        <TabsList className="grid w-full max-w-[500px] grid-cols-3">
          <TabsTrigger value="today" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {t('tasks.todayPlan')}
          </TabsTrigger>
          <TabsTrigger value="week" className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4" />
            {t('tasks.weekPlan')}
          </TabsTrigger>
          <TabsTrigger value="all" className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            {t('tasks.allTasks')}
          </TabsTrigger>
        </TabsList>

        {/* Today Plan Tab */}
        <TabsContent value="today" className="space-y-4 mt-4">
          {/* Today's Tasks */}
          <div className="space-y-3">
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
            <Card className="border-dashed border-2 bg-muted/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
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
        <TabsContent value="week" className="space-y-4 mt-4">
          {/* Week Tasks List */}
          <div className="space-y-3">
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
                {weekTasks
                  .sort((a, b) => {
                    if (!a.plan_date) return 1;
                    if (!b.plan_date) return -1;
                    return a.plan_date.localeCompare(b.plan_date);
                  })
                  .map((task) => renderTaskCard(task, true, task.plan_date === todayStr))}
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
                  const deadlineInfo = getDeadlineInfo(task);
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
          <div className="space-y-3">
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
                {tasks
                  .sort((a, b) => {
                    const priorityOrder = { high: 1, medium: 2, low: 3 };
                    return priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder];
                  })
                  .map((task) => renderTaskCard(task, true, task.plan_date === todayStr))}
              </div>
            )}
          </div>

          {/* Clear Completed */}
          {overallStats.completed > 0 && (
            <div className="flex justify-center">
              <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="text-muted-foreground">
                    <Trash2 className="w-4 h-4 mr-2" />
                    {t('tasks.clearCompleted')}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('tasks.confirmClear')}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('tasks.confirmClearDesc')}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearCompleted} className="bg-destructive">
                      {t('common.delete')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </TabsContent>
      </Tabs>


      {/* Edit Task Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
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
                  <Select value={editingTask.priority} onValueChange={(v) => setEditingTask({ ...editingTask, priority: v })}>
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
                  onChange={(e) => setEditingTask({ ...editingTask, estimated_time: e.target.value ? parseInt(e.target.value) : null })}
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
      <Dialog open={showPlanDialog} onOpenChange={setShowPlanDialog}>
        <DialogContent className="sm:max-w-[425px]">
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
