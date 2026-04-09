'use client';

import { useState, useMemo } from 'react';
import { useTasks } from '@/hooks/useTasks';
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
  SortAsc
} from 'lucide-react';
import { PRIORITY_CONFIG, STATUS_CONFIG, TASK_CATEGORIES } from '@/lib/types';
import { format, differenceInDays, isPast, isToday } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { toast } from 'sonner';

export default function TasksPage() {
  const { tasks, loading, addTask, updateTask, deleteTask, clearCompleted } = useTasks();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'priority' | 'deadline'>('priority');

  // 新任务表单
  const [newTask, setNewTask] = useState({
    title: '',
    category: '学习',
    priority: 'medium',
    deadline: '',
    estimated_time: ''
  });

  // 过滤和排序任务
  const filteredTasks = useMemo(() => {
    let result = [...tasks];
    
    // 过滤
    if (filterStatus !== 'all') {
      result = result.filter(t => t.status === filterStatus);
    }
    if (filterCategory !== 'all') {
      result = result.filter(t => t.category === filterCategory);
    }
    
    // 排序
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

  // 统计数据
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const inProgress = tasks.filter(t => t.status === 'in_progress').length;
    const pending = tasks.filter(t => t.status === 'pending').length;
    const highPriority = tasks.filter(t => t.priority === 'high' && t.status !== 'completed').length;
    return { total, completed, inProgress, pending, highPriority };
  }, [tasks]);

  const handleAddTask = async () => {
    if (!newTask.title.trim()) {
      toast.error('请输入任务名称');
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
      toast.success('任务创建成功');
      setShowAddDialog(false);
      setNewTask({ title: '', category: '学习', priority: 'medium', deadline: '', estimated_time: '' });
    } else {
      toast.error('创建失败');
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
      toast.success('任务更新成功');
      setShowEditDialog(false);
      setEditingTask(null);
    } else {
      toast.error('更新失败');
    }
  };

  const handleStatusChange = async (taskId: string, status: 'pending' | 'in_progress' | 'completed') => {
    await updateTask(taskId, { status });
    if (status === 'completed') {
      toast.success('太棒了！任务完成');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    await deleteTask(taskId);
    toast.success('任务已移入回收站');
  };

  const handleClearCompleted = async () => {
    const completedIds = tasks.filter(t => t.status === 'completed').map(t => t.id);
    await clearCompleted(completedIds);
    setShowClearDialog(false);
    toast.success('已完成任务已清空');
  };

  const getDeadlineInfo = (deadline: string | undefined) => {
    if (!deadline) return null;
    const deadlineDate = new Date(deadline);
    const days = differenceInDays(deadlineDate, new Date());
    
    if (isPast(deadlineDate) && !isToday(deadlineDate)) {
      return { text: `已逾期 ${Math.abs(days)} 天`, color: 'text-red-500', urgent: true };
    }
    if (days === 0) {
      return { text: '今天截止', color: 'text-orange-500', urgent: true };
    }
    if (days <= 3) {
      return { text: `${days} 天后截止`, color: 'text-orange-500', urgent: true };
    }
    return { text: `${days} 天`, color: 'text-muted-foreground', urgent: false };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in">
      {/* 页面标题 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">任务管理</h1>
          <p className="text-muted-foreground mt-1">高效管理你的学习任务</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="gradient-bg">
              <Plus className="w-4 h-4 mr-2" />
              添加任务
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>添加新任务</DialogTitle>
              <DialogDescription>创建新的学习任务，开始你的学习之旅</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>任务名称 *</Label>
                <Input
                  placeholder="请输入任务名称"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>分类</Label>
                  <Select value={newTask.category} onValueChange={(v) => setNewTask({ ...newTask, category: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TASK_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>优先级</Label>
                  <Select value={newTask.priority} onValueChange={(v) => setNewTask({ ...newTask, priority: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-red-500" />
                          高优先级
                        </span>
                      </SelectItem>
                      <SelectItem value="medium">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-yellow-500" />
                          中优先级
                        </span>
                      </SelectItem>
                      <SelectItem value="low">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-green-500" />
                          低优先级
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>截止日期</Label>
                  <Input
                    type="date"
                    value={newTask.deadline}
                    onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>预计时长（分钟）</Label>
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
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>取消</Button>
              <Button className="gradient-bg" onClick={handleAddTask}>创建任务</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="card-hover">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">总任务</p>
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
                <p className="text-xs text-muted-foreground">待开始</p>
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
                <p className="text-xs text-muted-foreground">进行中</p>
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
                <p className="text-xs text-muted-foreground">已完成</p>
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
                <p className="text-xs text-muted-foreground">高优先级</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 进度条 */}
      {stats.total > 0 && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">今日进度</span>
              <span className="text-sm text-muted-foreground">{stats.completed}/{stats.total}</span>
            </div>
            <Progress value={(stats.completed / stats.total) * 100} className="h-2" />
          </CardContent>
        </Card>
      )}

      {/* 筛选和排序 */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="pending">待办</SelectItem>
              <SelectItem value="in_progress">进行中</SelectItem>
              <SelectItem value="completed">已完成</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="分类" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部分类</SelectItem>
            {TASK_CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
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
              <SelectItem value="priority">按优先级</SelectItem>
              <SelectItem value="deadline">按截止日期</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 任务列表 */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <Card className="py-12">
            <CardContent className="text-center">
              <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-lg font-medium">暂无任务</p>
              <p className="text-sm text-muted-foreground mt-1">点击上方按钮添加你的第一个任务</p>
            </CardContent>
          </Card>
        ) : (
          filteredTasks.map((task) => {
            const priorityConfig = PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG];
            const statusConfig = STATUS_CONFIG[task.status as keyof typeof STATUS_CONFIG];
            const deadlineInfo = getDeadlineInfo(task.deadline);

            return (
              <Card
                key={task.id}
                className={`card-hover transition-all ${task.status === 'completed' ? 'opacity-60' : ''}`}
              >
                <CardContent className="flex items-center gap-4 py-4">
                  {/* 状态切换 */}
                  <Checkbox
                    checked={task.status === 'completed'}
                    onCheckedChange={(checked) => handleStatusChange(task.id, checked ? 'completed' : 'pending')}
                    className="w-5 h-5"
                  />

                  {/* 任务信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`font-medium ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                        {task.title}
                      </span>
                      <Badge variant="outline" className={`${priorityConfig.textColor} border-current`}>
                        {priorityConfig.label}
                      </Badge>
                      <Badge variant="secondary">{task.category}</Badge>
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
                          {task.estimated_time} 分钟
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex items-center gap-2">
                    {task.status !== 'completed' && task.status !== 'in_progress' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleStatusChange(task.id, 'in_progress')}
                        title="开始任务"
                      >
                        <PlayCircle className="w-4 h-4 text-cyan-500" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingTask(task);
                        setShowEditDialog(true);
                      }}
                      title="编辑"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteTask(task.id)}
                      title="删除"
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

      {/* 清空已完成按钮 */}
      {stats.completed > 0 && (
        <div className="flex justify-center">
          <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="text-muted-foreground">
                <Trash2 className="w-4 h-4 mr-2" />
                清空已完成任务
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>确认清空</AlertDialogTitle>
                <AlertDialogDescription>
                  确定要清空所有已完成的任务吗？清空后可在回收站恢复。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearCompleted} className="bg-destructive">
                  清空
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      {/* 编辑任务对话框 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑任务</DialogTitle>
          </DialogHeader>
          {editingTask && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>任务名称 *</Label>
                <Input
                  value={editingTask.title}
                  onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>分类</Label>
                  <Select value={editingTask.category} onValueChange={(v) => setEditingTask({ ...editingTask, category: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TASK_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>优先级</Label>
                  <Select value={editingTask.priority} onValueChange={(v) => setEditingTask({ ...editingTask, priority: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">高优先级</SelectItem>
                      <SelectItem value="medium">中优先级</SelectItem>
                      <SelectItem value="low">低优先级</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>截止日期</Label>
                  <Input
                    type="date"
                    value={editingTask.deadline || ''}
                    onChange={(e) => setEditingTask({ ...editingTask, deadline: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>预计时长（分钟）</Label>
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
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>取消</Button>
            <Button className="gradient-bg" onClick={handleUpdateTask}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
