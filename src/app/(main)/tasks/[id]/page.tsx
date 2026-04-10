'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTasks } from '@/hooks/useTasks';
import { useLanguage } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Circle,
  Clock,
  Flag,
  ListTodo,
  Plus,
  Target,
  Trash2,
  X,
  CalendarDays,
  Timer,
  Edit2
} from 'lucide-react';

interface Subtask {
  id: string;
  task_id: string;
  title: string;
  completed: number;
  sort_order: number;
  created_at: string;
}

const PRIORITY_CONFIG: Record<string, { labelKey: string; color: string; bgColor: string }> = {
  high: { labelKey: 'priority.high', color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/30' },
  medium: { labelKey: 'priority.medium', color: 'text-yellow-600', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30' },
  low: { labelKey: 'priority.low', color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/30' },
};

const STATUS_CONFIG: Record<string, { labelKey: string; color: string }> = {
  pending: { labelKey: 'tasks.pending', color: 'text-gray-600' },
  in_progress: { labelKey: 'tasks.inProgress', color: 'text-blue-600' },
  completed: { labelKey: 'tasks.completed', color: 'text-green-600' },
};

export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { t } = useLanguage();
  const { tasks, updateTask, deleteTask } = useTasks();
  
  const [task, setTask] = useState<any>(null);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingDescription, setEditingDescription] = useState(false);
  const [description, setDescription] = useState('');
  
  // Subtask editing states
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editingSubtaskTitle, setEditingSubtaskTitle] = useState('');
  
  // Subtask drag states
  const [draggedSubtask, setDraggedSubtask] = useState<Subtask | null>(null);
  const [dragOverSubtask, setDragOverSubtask] = useState<string | null>(null);
  
  // Edit mode states
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    category: 'study',
    priority: 'medium',
    deadline: '',
    plan_date: '',
    estimated_time: ''
  });

  // Find task from context or fetch
  useEffect(() => {
    const foundTask = tasks.find(t => t.id === id);
    if (foundTask) {
      setTask(foundTask);
      setDescription(foundTask.description || '');
      setEditForm({
        title: foundTask.title,
        description: foundTask.description || '',
        category: foundTask.category,
        priority: foundTask.priority,
        deadline: foundTask.deadline || '',
        plan_date: foundTask.plan_date || '',
        estimated_time: foundTask.estimated_time?.toString() || ''
      });
      setSubtasks(foundTask.subtasks || []);
      setLoading(false);
    } else {
      // Fetch task detail
      fetchTaskDetail();
    }
  }, [id, tasks]);

  const fetchTaskDetail = async () => {
    try {
      const res = await api.get(`/tasks/${id}`);
      if (res.success && res.data) {
        setTask(res.data);
        setDescription(res.data.description || '');
        setEditForm({
          title: res.data.title,
          description: res.data.description || '',
          category: res.data.category,
          priority: res.data.priority,
          deadline: res.data.deadline || '',
          plan_date: res.data.plan_date || '',
          estimated_time: res.data.estimated_time?.toString() || ''
        });
        setSubtasks(res.data.subtasks || []);
      }
    } catch {
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  // Fetch subtasks
  const fetchSubtasks = async () => {
    try {
      const res = await api.get(`/subtasks?taskId=${id}`);
      if (res.success) {
        setSubtasks(res.data || []);
      }
    } catch {
      console.error('Failed to fetch subtasks');
    }
  };

  useEffect(() => {
    if (id) {
      fetchSubtasks();
    }
  }, [id]);

  // Toggle subtask completion
  const toggleSubtask = async (subtaskId: string, currentCompleted: number) => {
    try {
      const newCompleted = currentCompleted ? 0 : 1;
      const res = await api.put('/subtasks', { id: subtaskId, completed: newCompleted });
      if (res.success) {
        const updatedSubtasks = subtasks.map(s => 
          s.id === subtaskId ? { ...s, completed: newCompleted } : s
        );
        setSubtasks(updatedSubtasks);
        // Update parent task subtask counts using server-calculated stats
        if (task && res.parentStats) {
          setTask({
            ...task,
            ...res.parentStats
          });
          // Also update the global tasks state
          updateTask(task.id, res.parentStats);
        }
      }
    } catch {
      toast.error(t('common.error'));
    }
  };

  // Add subtask
  const addSubtask = async () => {
    const title = newSubtaskTitle.trim();
    if (!title) {
      toast.error(t('common.required'));
      return;
    }
    
    try {
      const res = await api.post('/subtasks', { 
        taskId: id, 
        title: title
      });
      
      if (res.success && res.data) {
        const newSubtasks = [...subtasks, res.data];
        setSubtasks(newSubtasks);
        setNewSubtaskTitle('');
        
        // Update parent task subtask counts using server-calculated stats
        if (task && res.parentStats) {
          setTask({
            ...task,
            ...res.parentStats
          });
          // Also update the global tasks state
          updateTask(task.id, res.parentStats);
        }
        
        toast.success(t('tasks.subtaskAdded') || '子任务已添加');
      } else {
        toast.error(res.error || t('common.error'));
      }
    } catch (err) {
      console.error('[DEBUG] Add subtask error:', err);
      toast.error(t('common.error'));
    }
  };

  // Delete subtask
  const deleteSubtask = async (subtaskId: string) => {
    try {
      const res = await api.del(`/subtasks?id=${subtaskId}`);
      if (res.success) {
        const newSubtasks = subtasks.filter(s => s.id !== subtaskId);
        setSubtasks(newSubtasks);
        
        // Update parent task subtask counts using server-calculated stats
        if (task && res.parentStats) {
          setTask({
            ...task,
            ...res.parentStats
          });
          // Also update the global tasks state
          updateTask(task.id, res.parentStats);
        }
        
        toast.success(t('tasks.subtaskDeleted') || '子任务已删除');
      } else {
        toast.error(res.error || t('common.error'));
      }
    } catch (err) {
      console.error('Delete subtask error:', err);
      toast.error(t('common.error'));
    }
  };

  // Start editing subtask
  const startEditSubtask = (subtask: Subtask) => {
    setEditingSubtaskId(subtask.id);
    setEditingSubtaskTitle(subtask.title);
  };

  // Save subtask edit
  const saveSubtaskEdit = async (subtaskId: string) => {
    if (!editingSubtaskTitle.trim()) return;
    try {
      const res = await api.put('/subtasks', { id: subtaskId, title: editingSubtaskTitle.trim() });
      if (res.success) {
        setSubtasks(prev => prev.map(s => 
          s.id === subtaskId ? { ...s, title: editingSubtaskTitle.trim() } : s
        ));
        setEditingSubtaskId(null);
        setEditingSubtaskTitle('');
        toast.success(t('common.success'));
      }
    } catch {
      toast.error(t('common.error'));
    }
  };

  // Cancel subtask edit
  const cancelSubtaskEdit = () => {
    setEditingSubtaskId(null);
    setEditingSubtaskTitle('');
  };

  // Drag and drop handlers for subtasks
  const handleSubtaskDragStart = (subtask: Subtask) => {
    setDraggedSubtask(subtask);
  };

  const handleSubtaskDragOver = (e: React.DragEvent, subtaskId: string) => {
    e.preventDefault();
    setDragOverSubtask(subtaskId);
  };

  const handleSubtaskDragLeave = () => {
    setDragOverSubtask(null);
  };

  const handleSubtaskDrop = async (targetSubtask: Subtask) => {
    if (!draggedSubtask || draggedSubtask.id === targetSubtask.id) {
      setDraggedSubtask(null);
      setDragOverSubtask(null);
      return;
    }

    // Reorder subtasks
    const newSubtasks = [...subtasks];
    const draggedIndex = newSubtasks.findIndex(s => s.id === draggedSubtask.id);
    const targetIndex = newSubtasks.findIndex(s => s.id === targetSubtask.id);
    
    if (draggedIndex !== -1 && targetIndex !== -1) {
      newSubtasks.splice(draggedIndex, 1);
      newSubtasks.splice(targetIndex, 0, draggedSubtask);
      
      // Update sort_order for all affected subtasks
      const updates = newSubtasks.map((subtask, index) => ({
        id: subtask.id,
        sort_order: index
      }));
      
      setSubtasks(newSubtasks);
      
      // Save to server
      try {
        await api.put('/subtasks', { 
          id: draggedSubtask.id, 
          sortOrder: targetIndex 
        });
        // Update other subtasks' sort_order
        for (const update of updates) {
          if (update.id !== draggedSubtask.id) {
            await api.put('/subtasks', { 
              id: update.id, 
              sortOrder: update.sort_order 
            });
          }
        }
      } catch {
        toast.error(t('common.error'));
      }
    }
    
    setDraggedSubtask(null);
    setDragOverSubtask(null);
  };

  const handleSubtaskDragEnd = () => {
    setDraggedSubtask(null);
    setDragOverSubtask(null);
  };

  // Save description
  const saveDescription = async () => {
    try {
      const res = await updateTask(id, { description });
      if (res && task) {
        setTask({ ...task, description });
        setEditingDescription(false);
        toast.success(t('common.success'));
      }
    } catch {
      toast.error(t('common.error'));
    }
  };

  // Save task updates
  const saveTask = async () => {
    try {
      const updates: Record<string, any> = {
        title: editForm.title,
        description: editForm.description,
        category: editForm.category,
        priority: editForm.priority as 'high' | 'medium' | 'low',
        deadline: editForm.deadline || undefined,
        plan_date: editForm.plan_date || undefined,
        estimated_time: editForm.estimated_time ? parseInt(editForm.estimated_time) : undefined
      };
      const res = await updateTask(id, updates);
      if (res && task) {
        setTask({ ...task, ...updates });
        setEditing(false);
        toast.success(t('common.success'));
      }
    } catch {
      toast.error(t('common.error'));
    }
  };

  // Toggle task status
  const toggleStatus = async () => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    try {
      const updates: Record<string, any> = { 
        status: newStatus as 'pending' | 'in_progress' | 'completed',
        completed_at: newStatus === 'completed' ? new Date().toISOString() : null
      };
      const res = await updateTask(id, updates);
      if (res && task) {
        setTask({ ...task, ...updates });
        toast.success(t('common.success'));
      }
    } catch {
      toast.error(t('common.error'));
    }
  };

  // Delete task
  const handleDelete = async () => {
    if (!confirm(t('tasks.confirmDelete'))) return;
    try {
      const res = await deleteTask(id);
      if (res) {
        toast.success(t('common.success'));
        router.push('/tasks');
      }
    } catch {
      toast.error(t('common.error'));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">{t('common.loading')}</div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <p className="text-muted-foreground">{t('tasks.taskNotFound')}</p>
        <Button asChild variant="outline">
          <Link href="/tasks">{t('tasks.backToList')}</Link>
        </Button>
      </div>
    );
  }

  const priorityConfig = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
  const statusConfig = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
  const subtaskProgress = (task.subtask_total || 0) > 0 
    ? Math.min(100, Math.round(((task.subtask_completed || 0) / (task.subtask_total || 1)) * 100)) 
    : 0;
  const isOverdue = task.deadline && isPast(new Date(task.deadline)) && task.status !== 'completed';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/tasks">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{t('tasks.taskDetail')}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={task.status === 'completed' ? 'default' : 'outline'}
            size="sm"
            onClick={toggleStatus}
            className={task.status === 'completed' ? 'bg-green-600 hover:bg-green-700' : ''}
          >
            <CheckCircle className="w-4 h-4 mr-1" />
            {task.status === 'completed' ? t('tasks.completed') : t('tasks.markComplete')}
          </Button>
          <Button variant="outline" size="icon" onClick={() => setEditing(!editing)}>
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button variant="destructive" size="icon" onClick={handleDelete}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Edit Form */}
      {editing ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('tasks.editTask')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t('tasks.taskName')}</Label>
              <Input
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('tasks.category')}</Label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                  value={editForm.category}
                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                >
                  <option value="study">{t('categories.study')}</option>
                  <option value="work">{t('categories.work')}</option>
                  <option value="reading">{t('categories.reading')}</option>
                  <option value="exercise">{t('categories.exercise')}</option>
                  <option value="other">{t('categories.other')}</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <Label>{t('tasks.priority')}</Label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                  value={editForm.priority}
                  onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                >
                  <option value="high">{t('priority.high')}</option>
                  <option value="medium">{t('priority.medium')}</option>
                  <option value="low">{t('priority.low')}</option>
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('tasks.deadline')}</Label>
                <Input
                  type="date"
                  value={editForm.deadline}
                  onChange={(e) => setEditForm({ ...editForm, deadline: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label>{t('tasks.planDate')}</Label>
                <Input
                  type="date"
                  value={editForm.plan_date}
                  onChange={(e) => setEditForm({ ...editForm, plan_date: e.target.value })}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>{t('tasks.estimatedTime')}</Label>
              <Input
                type="number"
                placeholder={t('tasks.minutes')}
                value={editForm.estimated_time}
                onChange={(e) => setEditForm({ ...editForm, estimated_time: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label>{t('tasks.description')}</Label>
              <Textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                rows={4}
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditing(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={saveTask}>
                {t('common.save')}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Task Info */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              {/* Title & Status */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h2 className={`text-xl font-semibold ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                    {task.title}
                  </h2>
                </div>
                <Badge className={statusConfig.color}>
                  {t(statusConfig.labelKey)}
                </Badge>
              </div>
              
              {/* Meta Info */}
              <div className="flex flex-wrap gap-3">
                <Badge variant="outline" className={`${priorityConfig.color} ${priorityConfig.bgColor}`}>
                  <Flag className="w-3 h-3 mr-1" />
                  {t(priorityConfig.labelKey)}
                </Badge>
                
                <Badge variant="outline">
                  <Target className="w-3 h-3 mr-1" />
                  {t(`categories.${task.category}`)}
                </Badge>
                
                {task.deadline && (
                  <Badge variant="outline" className={isOverdue ? 'text-red-600 border-red-300' : ''}>
                    <Calendar className="w-3 h-3 mr-1" />
                    {t('tasks.deadline')}: {format(new Date(task.deadline), 'MM/dd')}
                    {isOverdue && ` (${t('tasks.overdue')})`}
                  </Badge>
                )}
                
                {task.plan_date && (
                  <Badge variant="outline">
                    <CalendarDays className="w-3 h-3 mr-1" />
                    {t('tasks.planDate')}: {format(new Date(task.plan_date), 'MM/dd')}
                    {isToday(new Date(task.plan_date)) && ` (${t('tasks.today')})`}
                  </Badge>
                )}
                
                {task.estimated_time && (
                  <Badge variant="outline">
                    <Timer className="w-3 h-3 mr-1" />
                    {task.estimated_time} {t('tasks.minutes')}
                  </Badge>
                )}
              </div>
              
              {/* Description */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-base">{t('tasks.description')}</Label>
                  <Button variant="ghost" size="sm" onClick={() => setEditingDescription(true)}>
                    <Edit2 className="w-3 h-3 mr-1" />
                    {t('common.edit')}
                  </Button>
                </div>
                
                {editingDescription ? (
                  <div className="space-y-2">
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder={t('tasks.descriptionPlaceholder')}
                      rows={4}
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => {
                        setDescription(task.description || '');
                        setEditingDescription(false);
                      }}>
                        {t('common.cancel')}
                      </Button>
                      <Button size="sm" onClick={saveDescription}>
                        {t('common.save')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground min-h-[60px] whitespace-pre-wrap">
                    {description || t('tasks.noDescription')}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Subtasks */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <ListTodo className="w-5 h-5" />
                  {t('tasks.subtasks')}
                  <span className="text-sm font-normal text-muted-foreground">
                    ({task.subtask_completed || 0}/{task.subtask_total || 0})
                  </span>
                </CardTitle>
                {task.subtask_total > 0 && (
                  <span className="text-sm font-medium">
                    {subtaskProgress}%
                  </span>
                )}
              </div>
              
              {/* Progress Bar */}
              {task.subtask_total > 0 && (
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-300"
                    style={{ width: `${subtaskProgress}%` }}
                  />
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add Subtask */}
              <div className="flex gap-2">
                <Input
                  placeholder={t('tasks.addSubtaskPlaceholder')}
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addSubtask()}
                />
                <Button onClick={addSubtask} disabled={!newSubtaskTitle.trim()}>
                  <Plus className="w-4 h-4 mr-1" />
                  {t('common.add')}
                </Button>
              </div>
              
              {/* Subtask List */}
              <div className="space-y-2">
                {subtasks.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    {t('tasks.noSubtasks')}
                  </p>
                ) : (
                  subtasks.map((subtask) => (
                    <div 
                      key={subtask.id}
                      draggable
                      onDragStart={() => handleSubtaskDragStart(subtask)}
                      onDragOver={(e) => handleSubtaskDragOver(e, subtask.id)}
                      onDragLeave={handleSubtaskDragLeave}
                      onDrop={() => handleSubtaskDrop(subtask)}
                      onDragEnd={handleSubtaskDragEnd}
                      className={`flex items-center gap-3 p-3 rounded-lg bg-muted/50 transition-all group cursor-grab active:cursor-grabbing ${
                        dragOverSubtask === subtask.id ? 'bg-primary/20 border-2 border-primary/50' : 'hover:bg-muted'
                      } ${draggedSubtask?.id === subtask.id ? 'opacity-50' : ''}`}
                    >
                      <button
                        onClick={() => toggleSubtask(subtask.id, subtask.completed)}
                        className="flex-shrink-0"
                      >
                        {subtask.completed ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <Circle className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
                        )}
                      </button>
                      
                      {editingSubtaskId === subtask.id ? (
                        // Editing mode
                        <Input
                          value={editingSubtaskTitle}
                          onChange={(e) => setEditingSubtaskTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveSubtaskEdit(subtask.id);
                            if (e.key === 'Escape') cancelSubtaskEdit();
                          }}
                          className="flex-1 h-8"
                          autoFocus
                        />
                      ) : (
                        // Display mode
                        <span 
                          className={`flex-1 cursor-pointer ${subtask.completed ? 'line-through text-muted-foreground' : ''}`}
                          onClick={() => !subtask.completed && startEditSubtask(subtask)}
                        >
                          {subtask.title}
                        </span>
                      )}
                      
                      {editingSubtaskId === subtask.id ? (
                        // Save/Cancel buttons
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => saveSubtaskEdit(subtask.id)}
                          >
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={cancelSubtaskEdit}
                          >
                            <X className="w-4 h-4 text-muted-foreground" />
                          </Button>
                        </>
                      ) : (
                        // Edit/Delete buttons
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                            onClick={() => startEditSubtask(subtask)}
                          >
                            <Edit2 className="w-4 h-4 text-muted-foreground hover:text-primary" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                            onClick={() => deleteSubtask(subtask.id)}
                          >
                            <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                          </Button>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Task Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                {t('tasks.timeline')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('tasks.createdAt')}</span>
                  <span>{task.created_at ? format(new Date(task.created_at), 'yyyy-MM-dd HH:mm') : '-'}</span>
                </div>
                {task.completed_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('tasks.completedAt')}</span>
                    <span className="text-green-600">{format(new Date(task.completed_at), 'yyyy-MM-dd HH:mm')}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
