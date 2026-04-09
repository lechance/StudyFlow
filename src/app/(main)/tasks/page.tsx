'use client';

import { useState, useMemo, useEffect } from 'react';
import { useTasks } from '@/hooks/useTasks';
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
  Plus,
  Trash2,
  Edit2,
  Calendar,
  Clock,
  CheckCircle2,
  Circle,
  PlayCircle,
  Sparkles,
  Filter,
  SortAsc,
  ListTodo,
  X
} from 'lucide-react';
import { api } from '@/lib/api';
import { format, differenceInDays, isPast, isToday } from 'date-fns';
import { toast } from 'sonner';

const PRIORITY_CONFIG: Record<string, { labelKey: string; textColor: string }> = {
  high: { labelKey: 'priority.high', textColor: 'text-red-500' },
  medium: { labelKey: 'priority.medium', textColor: 'text-yellow-500' },
  low: { labelKey: 'priority.low', textColor: 'text-green-500' },
};

export default function TasksPage() {
  const { tasks, loading, addTask, updateTask, deleteTask, clearCompleted, fetchTasks } = useTasks();
  const { t, language } = useLanguage();
  
  // Get category and priority translations
  const getCategoryLabel = (cat: string) => {
    return t(`category.${cat}`) || cat;
  };
  
  const getPriorityLabel = (priority: string) => {
    return t(PRIORITY_CONFIG[priority]?.labelKey || 'priority.medium');
  };
  
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [detailTask, setDetailTask] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'priority' | 'deadline'>('priority');
  
  // Subtask state
  const [subtasks, setSubtasks] = useState<any[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  // New task form - use category keys that can be translated
  const [newTask, setNewTask] = useState({
    title: '',
    category: 'study',
    priority: 'medium',
    deadline: '',
    estimated_time: ''
  });

  // Category keys for form options
  const categoryKeys = ['study', 'work', 'reading', 'exercise', 'other'];

  // Filter and sort tasks
  const filteredTasks = useMemo(() => {
    let result = [...tasks];
    
    // Filter
    if (filterStatus !== 'all') {
      result = result.filter(t => t.status === filterStatus);
    }
    if (filterCategory !== 'all') {
      result = result.filter(t => t.category === filterCategory);
    }
    
    // Sort
    if (sortBy === 'priority') {
      result.sort((a, b) => {
        const priorityOrder = { high: 1, medium: 2, low: 3 };
        return priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder];
      });
    } else {
      result.sort((a, b) => {
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      });
    }
    
    return result;
  }, [tasks, filterStatus, filterCategory, sortBy]);

  // Stats
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const inProgress = tasks.filter(t => t.status === 'in_progress').length;
    const pending = tasks.filter(t => t.status === 'pending').length;
    const highPriority = tasks.filter(t => t.priority === 'high' && t.status !== 'completed').length;
    return { total, completed, inProgress, pending, highPriority };
  }, [tasks]);

  // Fetch subtasks for a task
  const fetchSubtasks = async (taskId: string) => {
    try {
      const res = await api.get(`/api/subtasks?taskId=${taskId}`);
      if (res.success) {
        setSubtasks(res.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch subtasks:', error);
    }
  };

  // Open task detail dialog
  const openTaskDetail = async (task: any) => {
    setDetailTask(task);
    await fetchSubtasks(task.id);
    setShowDetailDialog(true);
  };

  // Toggle subtask completion
  const toggleSubtask = async (subtaskId: string, currentCompleted: number) => {
    try {
      const newCompleted = currentCompleted ? 0 : 1;
      const res = await api.put('/api/subtasks', { id: subtaskId, completed: newCompleted });
      if (res.success) {
        // Update local state
        setSubtasks(prev => prev.map(s => 
          s.id === subtaskId ? { ...s, completed: newCompleted } : s
        ));
        // Refresh task list to update progress
        await fetchTasks();
      }
    } catch (error) {
      console.error('Failed to toggle subtask:', error);
      toast.error(t('common.error'));
    }
  };

  // Add new subtask
  const addSubtask = async () => {
    if (!newSubtaskTitle.trim() || !detailTask) return;
    try {
      const res = await api.post('/api/subtasks', { 
        taskId: detailTask.id, 
        title: newSubtaskTitle.trim() 
      });
      if (res.success) {
        setSubtasks(prev => [...prev, res.data]);
        setNewSubtaskTitle('');
        toast.success(t('common.success'));
      }
    } catch (error) {
      console.error('Failed to add subtask:', error);
      toast.error(t('common.error'));
    }
  };

  // Delete subtask
  const deleteSubtask = async (subtaskId: string) => {
    try {
      const res = await api.del(`/api/subtasks?id=${subtaskId}`);
      if (res.success) {
        setSubtasks(prev => prev.filter(s => s.id !== subtaskId));
        toast.success(t('common.success'));
      }
    } catch (error) {
      console.error('Failed to delete subtask:', error);
      toast.error(t('common.error'));
    }
  };

  const handleAddTask = async () => {
    if (!newTask.title.trim()) {
      toast.error(t('tasks.taskName') + ' ' + t('common.required'));
      return;
    }

    const success = await addTask({
      title: newTask.title,
      category: newTask.category,
      priority: newTask.priority as 'high' | 'medium' | 'low',
      deadline: newTask.deadline || undefined,
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
        estimated_time: '' 
      });
    } else {
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
      estimated_time: editingTask.estimated_time ? parseInt(editingTask.estimated_time) : undefined
    });

    if (success) {
      toast.success(t('tasks.taskUpdated'));
      setShowEditDialog(false);
      setEditingTask(null);
    } else {
      toast.error(t('common.error'));
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

  const handleClearCompleted = async () => {
    const completedIds = tasks.filter(t => t.status === 'completed').map(t => t.id);
    await clearCompleted(completedIds);
    setShowClearDialog(false);
    toast.success(t('tasks.cleared'));
  };

  const getDeadlineInfo = (deadline: string | undefined) => {
    if (!deadline) return null;
    const deadlineDate = new Date(deadline);
    const days = differenceInDays(deadlineDate, new Date());
    
    if (isPast(deadlineDate) && !isToday(deadlineDate)) {
      return { 
        text: t('tasks.overdue', { days: Math.abs(days) }), 
        color: 'text-red-500', 
        urgent: true 
      };
    }
    if (days === 0) {
      return { 
        text: t('tasks.today'), 
        color: 'text-orange-500', 
        urgent: true 
      };
    }
    if (days <= 3) {
      return { 
        text: t('tasks.daysLeft', { days }), 
        color: 'text-orange-500', 
        urgent: true 
      };
    }
    return { 
      text: t('common.days', { count: days }), 
      color: 'text-muted-foreground', 
      urgent: false 
    };
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
                      <SelectItem value="high">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-red-500" />
                          {t('priority.high')}
                        </span>
                      </SelectItem>
                      <SelectItem value="medium">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-yellow-500" />
                          {t('priority.medium')}
                        </span>
                      </SelectItem>
                      <SelectItem value="low">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-green-500" />
                          {t('priority.low')}
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('tasks.deadline')}</Label>
                  <Input
                    type="date"
                    value={newTask.deadline}
                    onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
                  />
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
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>{t('common.cancel')}</Button>
              <Button className="gradient-bg" onClick={handleAddTask}>{t('tasks.createTask')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="card-hover">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">{t('tasks.total')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-500/10 flex items-center justify-center">
                <Circle className="w-5 h-5 text-slate-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">{t('tasks.pending')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                <PlayCircle className="w-5 h-5 text-cyan-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.inProgress}</p>
                <p className="text-xs text-muted-foreground">{t('tasks.inProgress')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.completed}</p>
                <p className="text-xs text-muted-foreground">{t('tasks.completed')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover border-red-200 bg-red-50/50 dark:bg-red-950/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.highPriority}</p>
                <p className="text-xs text-muted-foreground">{t('tasks.highPriority')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      {stats.total > 0 && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{t('tasks.todayProgress')}</span>
              <span className="text-sm text-muted-foreground">{stats.completed}/{stats.total}</span>
            </div>
            <Progress value={(stats.completed / stats.total) * 100} className="h-2" />
          </CardContent>
        </Card>
      )}

      {/* Filter and Sort */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder={t('common.status')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('tasks.allStatus')}</SelectItem>
              <SelectItem value="pending">{t('tasks.pending')}</SelectItem>
              <SelectItem value="in_progress">{t('tasks.inProgress')}</SelectItem>
              <SelectItem value="completed">{t('tasks.completed')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder={t('common.category')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('tasks.allCategory')}</SelectItem>
            {categoryKeys.map((key) => (
              <SelectItem key={key} value={key}>{t(`category.${key}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2 ml-auto">
          <SortAsc className="w-4 h-4 text-muted-foreground" />
          <Select value={sortBy} onValueChange={(v: 'priority' | 'deadline') => setSortBy(v)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="priority">{t('tasks.byPriority')}</SelectItem>
              <SelectItem value="deadline">{t('tasks.byDeadline')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
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
          filteredTasks.map((task) => {
            const priorityConfig = PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG];
            const deadlineInfo = getDeadlineInfo(task.deadline);
            const hasSubtasks = (task.subtask_total || 0) > 0;
            const subtaskProgress = task.subtask_progress || 0;

            return (
              <Card
                key={task.id}
                className={`card-hover transition-all ${task.status === 'completed' ? 'opacity-60' : ''}`}
              >
                <CardContent className="flex items-center gap-4 py-4">
                  {/* Status Toggle */}
                  <Checkbox
                    checked={task.status === 'completed'}
                    onCheckedChange={(checked) => handleStatusChange(task.id, checked ? 'completed' : 'pending')}
                    className="w-5 h-5"
                    onClick={(e) => e.stopPropagation()}
                  />

                  {/* Task Info - Clickable */}
                  <div 
                    className="flex-1 min-w-0 cursor-pointer" 
                    onClick={() => openTaskDetail(task)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`font-medium ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                        {task.title}
                      </span>
                      <Badge variant="outline" className={`${priorityConfig?.textColor} border-current`}>
                        {t(priorityConfig?.labelKey || 'priority.medium')}
                      </Badge>
                      <Badge variant="secondary">{t(`category.${task.category}`)}</Badge>
                      {hasSubtasks && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">
                          <ListTodo className="w-3 h-3 mr-1" />
                          {task.subtask_completed || 0}/{task.subtask_total || 0}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {deadlineInfo && (
                        <span className={`flex items-center gap-1 ${deadlineInfo.color}`}>
                          <Calendar className="w-3 h-3" />
                          {deadlineInfo.text}
                        </span>
                      )}
                      {task.estimated_time && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {t('tasks.minutes', { minutes: task.estimated_time })}
                        </span>
                      )}
                      {/* Subtask Progress Bar */}
                      {hasSubtasks && (
                        <div className="flex items-center gap-2 flex-1 max-w-[200px]">
                          <Progress value={subtaskProgress} className="h-1.5 flex-1" />
                          <span className="text-xs">{subtaskProgress}%</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    {task.status !== 'completed' && task.status !== 'in_progress' && (
                      <Button
                        variant="ghost"
                        size="icon"
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
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTask(task.id);
                      }}
                      title={t('common.delete')}
                      className="hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Clear Completed Button */}
      {stats.completed > 0 && (
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

      {/* Task Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">{detailTask?.title}</DialogTitle>
            <DialogDescription>
              {detailTask?.deadline && (
                <span className="flex items-center gap-1 text-sm">
                  <Calendar className="w-4 h-4" />
                  {t('tasks.deadline')}: {format(new Date(detailTask.deadline), 'yyyy-MM-dd')}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Task Info */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className={PRIORITY_CONFIG[detailTask?.priority]?.textColor}>
                {t(PRIORITY_CONFIG[detailTask?.priority]?.labelKey || 'priority.medium')}
              </Badge>
              <Badge variant="secondary">{t(`category.${detailTask?.category}`)}</Badge>
              {detailTask?.status === 'completed' && (
                <Badge className="bg-green-500">{t('tasks.completed')}</Badge>
              )}
            </div>

            {/* Subtasks Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium flex items-center gap-2">
                  <ListTodo className="w-4 h-4" />
                  {t('tasks.subtasks') || '子任务'}
                </h4>
                {subtasks.length > 0 && (
                  <span className="text-sm text-muted-foreground">
                    {subtasks.filter(s => s.completed).length}/{subtasks.length}
                  </span>
                )}
              </div>
              
              {/* Subtask Progress */}
              {subtasks.length > 0 && (
                <Progress 
                  value={subtasks.length > 0 ? (subtasks.filter(s => s.completed).length / subtasks.length) * 100 : 0} 
                  className="h-2" 
                />
              )}

              {/* Subtask List */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {subtasks.map((subtask) => (
                  <div 
                    key={subtask.id} 
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 group"
                  >
                    <Checkbox
                      checked={subtask.completed === 1}
                      onCheckedChange={() => toggleSubtask(subtask.id, subtask.completed)}
                    />
                    <span className={`flex-1 ${subtask.completed ? 'line-through text-muted-foreground' : ''}`}>
                      {subtask.title}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:text-destructive"
                      onClick={() => deleteSubtask(subtask.id)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
                {subtasks.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {t('tasks.noSubtasks') || '暂无子任务'}
                  </p>
                )}
              </div>

              {/* Add Subtask */}
              <div className="flex gap-2 pt-2">
                <Input
                  placeholder={t('tasks.addSubtaskPlaceholder') || '添加子任务...'}
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      addSubtask();
                    }
                  }}
                />
                <Button onClick={addSubtask} disabled={!newSubtaskTitle.trim()}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
              {t('common.close') || '关闭'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                  <Label>{t('tasks.deadline')}</Label>
                  <Input
                    type="date"
                    value={editingTask.deadline || ''}
                    onChange={(e) => setEditingTask({ ...editingTask, deadline: e.target.value })}
                  />
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
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>{t('common.cancel')}</Button>
            <Button className="gradient-bg" onClick={handleUpdateTask}>{t('common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
