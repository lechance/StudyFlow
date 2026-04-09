'use client';

import { useEffect, useState } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { useLanguage } from '@/lib/i18n';
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
  const { t, language } = useLanguage();
  const [clearing, setClearing] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);

  useEffect(() => {
    fetchRecycleBin();
  }, [fetchRecycleBin]);

  const handleRestore = async (taskId: string) => {
    setRestoring(taskId);
    const success = await restoreTask(taskId);
    if (success) {
      toast.success(t('recycle.taskRestored'));
    } else {
      toast.error(t('common.error'));
    }
    setRestoring(null);
  };

  const handleClearAll = async () => {
    setClearing(true);
    const success = await clearRecycleBin();
    if (success) {
      toast.success(t('recycle.recycleCleared'));
    } else {
      toast.error(t('common.error'));
    }
    setClearing(false);
  };

  return (
    <div className="space-y-6 animate-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{t('recycle.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('recycle.subtitle')}</p>
        </div>
        {recycleBin.length > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash className="w-4 h-4 mr-2" />
                {t('recycle.clearAll')}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('recycle.confirmDelete')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('recycle.confirmClearAll')}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearAll} className="bg-destructive">
                  {clearing ? t('common.clearing') : t('common.confirm')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="card-hover">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-500/10 flex items-center justify-center">
                <Package className="w-5 h-5 text-slate-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{recycleBin.length}</p>
                <p className="text-xs text-muted-foreground">{t('recycle.recycleCount')}</p>
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
                <p className="text-xs text-muted-foreground">{t('recycle.recoverable')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Empty State */}
      {recycleBin.length === 0 ? (
        <Card className="py-12">
          <CardContent className="text-center">
            <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
              <Trash2 className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium">{t('recycle.empty')}</p>
            <p className="text-sm text-muted-foreground mt-1">{t('recycle.deletedItems')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {t('recycle.recoverableDays')}
          </p>
          
          {recycleBin.map((item) => {
            const task = item.task;
            return (
              <Card key={item.id} className="card-hover">
                <CardContent className="flex items-center gap-4 py-4">
                  {/* Task Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium line-through text-muted-foreground">
                        {task?.title || t('common.unknown')}
                      </span>
                      <Badge variant="outline">{task?.category ? t(`category.${task.category}`) : t('common.other')}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {t('recycle.deletedAt', { date: format(new Date(item.deleted_at), 'yyyy-MM-dd HH:mm') })}
                      </span>
                      {task?.deadline && (
                        <span>
                          {t('common.due')}: {format(new Date(task.deadline), 'yyyy-MM-dd')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRestore(task?.id)}
                      disabled={restoring === task?.id}
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      {restoring === task?.id ? t('recycle.restoring') : t('recycle.restore')}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="hover:text-destructive">
                          <Trash className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t('recycle.confirmDelete')}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t('recycle.confirmDeleteDesc', { title: task?.title || '' })}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={async () => {
                              toast.success(t('recycle.taskPermanentlyDeleted'));
                              await fetchRecycleBin();
                            }}
                            className="bg-destructive"
                          >
                            {t('common.delete')}
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

      {/* Tips */}
      <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="font-medium text-amber-600 dark:text-amber-400">{t('recycle.tip')}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {t('recycle.tipContent')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
