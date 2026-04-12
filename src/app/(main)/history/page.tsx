'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useTasks } from '@/hooks/useTasks';
import { useLanguage } from '@/lib/i18n';
import type { Task } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Search,
  ArrowUpDown,
  CheckCircle2,
  Clock,
  Flag,
  Tag,
  Calendar,
  RotateCcw,
  Loader2
} from 'lucide-react';
import { tasksApi } from '@/lib/api';
import { format, differenceInDays, isPast, isToday, isTomorrow } from 'date-fns';
import { toast } from 'sonner';

const PRIORITY_CONFIG: Record<string, { labelKey: string; textColor: string; bgColor: string }> = {
  high: { labelKey: 'priority.high', textColor: 'text-red-600', bgColor: 'bg-red-50 dark:bg-red-950/30' },
  medium: { labelKey: 'priority.medium', textColor: 'text-yellow-600', bgColor: 'bg-yellow-50 dark:bg-yellow-950/30' },
  low: { labelKey: 'priority.low', textColor: 'text-green-600', bgColor: 'bg-green-50 dark:bg-green-950/30' },
};

const CATEGORY_CONFIG: Record<string, { labelKey: string; color: string }> = {
  study: { labelKey: 'category.study', color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30' },
  work: { labelKey: 'category.work', color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/30' },
  reading: { labelKey: 'category.reading', color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30' },
  exercise: { labelKey: 'category.exercise', color: 'text-green-600 bg-green-50 dark:bg-green-950/30' },
  other: { labelKey: 'category.other', color: 'text-gray-600 bg-gray-50 dark:bg-gray-950/30' },
};

type SortField = 'completed_at' | 'title' | 'priority' | 'category';
type SortOrder = 'asc' | 'desc';

export default function HistoryPage() {
  const { tasks, loading, fetchTasks, updateTask } = useTasks();
  const { t } = useLanguage();
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('completed_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  
  // Restoring state
  const [restoringId, setRestoringId] = useState<string | null>(null);

  // Filter completed tasks
  const completedTasks = useMemo(() => {
    return tasks.filter(task => task.status === 'completed');
  }, [tasks]);

  // Apply search, filter and sort
  const filteredTasks = useMemo(() => {
    let filtered = [...completedTasks];
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(task => 
        task.title.toLowerCase().includes(query) ||
        task.category.toLowerCase().includes(query)
      );
    }
    
    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(task => task.category === categoryFilter);
    }
    
    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'completed_at':
          const dateA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
          const dateB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
          comparison = dateA - dateB;
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'priority':
          const priorityOrder = { high: 1, medium: 2, low: 3 };
          comparison = (priorityOrder[a.priority as keyof typeof priorityOrder] || 4) - 
                       (priorityOrder[b.priority as keyof typeof priorityOrder] || 4);
          break;
        case 'category':
          comparison = a.category.localeCompare(b.category);
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return filtered;
  }, [completedTasks, searchQuery, categoryFilter, sortField, sortOrder]);

  // Get priority config for a task
  const getPriorityConfig = (priority: string) => {
    return PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.medium;
  };

  // Get category config for a task
  const getCategoryConfig = (category: string) => {
    return CATEGORY_CONFIG[category] || CATEGORY_CONFIG.other;
  };

  // Format completed date
  const formatCompletedDate = (dateStr: string | undefined) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return format(date, 'yyyy-MM-dd HH:mm');
  };

  // Get time ago string
  const getTimeAgo = (dateStr: string | undefined) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return t('tasks.completedToday') || '今天';
    if (diffDays === 1) return t('tasks.completedYesterday') || '昨天';
    if (diffDays < 7) return `${diffDays}${t('tasks.daysAgo') || '天前'}`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}${t('tasks.weeksAgo') || '周前'}`;
    return `${Math.floor(diffDays / 30)}${t('tasks.monthsAgo') || '个月前'}`;
  };

  // Restore task to pending
  const handleRestoreTask = async (taskId: string) => {
    setRestoringId(taskId);
    try {
      const success = await updateTask(taskId, { status: 'pending' });
      if (success) {
        toast.success(t('tasks.taskRestored') || '任务已恢复');
        await fetchTasks();
      }
    } catch {
      toast.error(t('common.error') || '操作失败');
    } finally {
      setRestoringId(null);
    }
  };

  // Toggle sort order
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Sort icon component
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 opacity-30" />;
    }
    return <ArrowUpDown className={`w-4 h-4 ${sortOrder === 'asc' ? '' : 'rotate-180'}`} />;
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
      <div>
        <h1 className="text-2xl font-bold">{t('history.title') || '历史任务'}</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          {t('history.subtitle') || `共 ${completedTasks.length} 个已完成任务`}
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t('history.searchPlaceholder') || '搜索任务名称...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            
            {/* Category Filter */}
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full lg:w-40">
                <SelectValue placeholder={t('history.allCategories') || '所有分类'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('history.allCategories') || '所有分类'}</SelectItem>
                <SelectItem value="study">{t('category.study') || '学习'}</SelectItem>
                <SelectItem value="work">{t('category.work') || '工作'}</SelectItem>
                <SelectItem value="reading">{t('category.reading') || '阅读'}</SelectItem>
                <SelectItem value="exercise">{t('category.exercise') || '运动'}</SelectItem>
                <SelectItem value="other">{t('category.other') || '其他'}</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort Field */}
            <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
              <SelectTrigger className="w-full lg:w-36">
                <SelectValue placeholder={t('history.sortBy') || '排序方式'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="completed_at">{t('history.completedAt') || '完成时间'}</SelectItem>
                <SelectItem value="title">{t('history.taskName') || '任务名称'}</SelectItem>
                <SelectItem value="priority">{t('tasks.priority') || '优先级'}</SelectItem>
                <SelectItem value="category">{t('tasks.category') || '分类'}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        {t('history.showing') || '显示'} {filteredTasks.length} / {completedTasks.length} {t('history.tasks') || '个任务'}
      </div>

      {/* Tasks Table */}
      {filteredTasks.length === 0 ? (
        <Card className="py-12">
          <CardContent className="text-center">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-30" />
            <p className="text-muted-foreground">
              {completedTasks.length === 0 
                ? (t('history.noCompletedTasks') || '暂无已完成的任务')
                : (t('history.noMatchingTasks') || '没有匹配的任务')
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-12">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer select-none"
                    onClick={() => handleSort('title')}
                  >
                    <div className="flex items-center gap-1">
                      {t('history.taskName') || '任务名称'}
                      <SortIcon field="title" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer select-none"
                    onClick={() => handleSort('category')}
                  >
                    <div className="flex items-center gap-1">
                      <Tag className="w-4 h-4" />
                      {t('tasks.category') || '分类'}
                      <SortIcon field="category" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer select-none"
                    onClick={() => handleSort('priority')}
                  >
                    <div className="flex items-center gap-1">
                      <Flag className="w-4 h-4" />
                      {t('tasks.priority') || '优先级'}
                      <SortIcon field="priority" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer select-none"
                    onClick={() => handleSort('completed_at')}
                  >
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {t('history.completedAt') || '完成时间'}
                      <SortIcon field="completed_at" />
                    </div>
                  </TableHead>
                  <TableHead className="w-24 text-right">
                    {t('history.actions') || '操作'}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTasks.map((task) => {
                  const priorityConfig = getPriorityConfig(task.priority);
                  const categoryConfig = getCategoryConfig(task.category);
                  
                  return (
                    <TableRow key={task.id} className="group">
                      <TableCell>
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      </TableCell>
                      <TableCell>
                        <Link 
                          href={`/tasks/${task.id}`}
                          className="space-y-1 hover:underline"
                        >
                          <span className="line-through text-muted-foreground font-medium">
                            {task.title}
                          </span>
                          {task.estimated_time && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              <span>{task.estimated_time}{t('tasks.minutes') || '分钟'}</span>
                            </div>
                          )}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={`${categoryConfig.color} border-0 font-normal`}
                        >
                          {t(categoryConfig.labelKey) || task.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={`${priorityConfig.textColor} ${priorityConfig.bgColor} border-0 font-normal`}
                        >
                          {t(priorityConfig.labelKey)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <div className="text-sm">
                            {formatCompletedDate(task.updated_at)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {getTimeAgo(task.updated_at)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleRestoreTask(task.id)}
                          disabled={restoringId === task.id}
                        >
                          {restoringId === task.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <RotateCcw className="w-4 h-4 mr-1" />
                              {t('history.restore') || '恢复'}
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
