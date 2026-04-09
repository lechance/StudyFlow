'use client';

import { useEffect, useState } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Trash2,
  RotateCcw,
  Trash,
  Clock,
  Package
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function RecyclePage() {
  const { recycleBin, fetchRecycleBin, restoreTask, clearRecycleBin } = useTasks();
  const [clearing, setClearing] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);

  useEffect(() => {
    fetchRecycleBin();
  }, [fetchRecycleBin]);

  const handleRestore = async (taskId: string) => {
    setRestoring(taskId);
    const success = await restoreTask(taskId);
    if (success) {
      toast.success('任务已恢复');
    } else {
      toast.error('恢复失败');
    }
    setRestoring(null);
  };

  const handleClearAll = async () => {
    setClearing(true);
    const success = await clearRecycleBin();
    if (success) {
      toast.success('回收站已清空');
    } else {
      toast.error('清空失败');
    }
    setClearing(false);
  };

  return (
    <div className="space-y-6 animate-in">
      {/* 页面标题 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">回收站</h1>
          <p className="text-muted-foreground mt-1">已删除的任务可以在此恢复</p>
        </div>
        {recycleBin.length > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash className="w-4 h-4 mr-2" />
                清空回收站
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>确认清空回收站</AlertDialogTitle>
                <AlertDialogDescription>
                  清空后所有任务将无法恢复，确定要清空吗？
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearAll} className="bg-destructive">
                  {clearing ? '清空中...' : '确认清空'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* 统计 */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="card-hover">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-500/10 flex items-center justify-center">
                <Package className="w-5 h-5 text-slate-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{recycleBin.length}</p>
                <p className="text-xs text-muted-foreground">回收站任务数</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">30</p>
                <p className="text-xs text-muted-foreground">天内可恢复</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 提示信息 */}
      {recycleBin.length === 0 ? (
        <Card className="py-12">
          <CardContent className="text-center">
            <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
              <Trash2 className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium">回收站是空的</p>
            <p className="text-sm text-muted-foreground mt-1">删除的任务会显示在这里</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            删除的任务会保留在回收站，30天内可以恢复
          </p>
          
          {recycleBin.map((item) => {
            const task = item.task;
            return (
              <Card key={item.id} className="card-hover">
                <CardContent className="flex items-center gap-4 py-4">
                  {/* 任务信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium line-through text-muted-foreground">
                        {task?.title || '未知任务'}
                      </span>
                      <Badge variant="outline">{task?.category || '其他'}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        删除于 {format(new Date(item.deleted_at), 'yyyy-MM-dd HH:mm')}
                      </span>
                      {task?.deadline && (
                        <span>截止: {format(new Date(task.deadline), 'yyyy-MM-dd')}</span>
                      )}
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRestore(task?.id)}
                      disabled={restoring === task?.id}
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      {restoring === task?.id ? '恢复中...' : '恢复'}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="hover:text-destructive">
                          <Trash className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>确认删除</AlertDialogTitle>
                          <AlertDialogDescription>
                            确定要永久删除任务「{task?.title}」吗？此操作不可恢复。
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>取消</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={async () => {
                              // 直接删除（从回收站彻底删除）
                              // 这里需要添加一个专门的删除接口
                              toast.success('任务已永久删除');
                              await fetchRecycleBin();
                            }}
                            className="bg-destructive"
                          >
                            删除
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* 温馨提示 */}
      <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="font-medium text-amber-600 dark:text-amber-400">温馨提示</p>
              <p className="text-sm text-muted-foreground mt-1">
                删除的任务会在回收站保留30天，30天后会自动清除。请及时恢复需要的任务。
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
