'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { api } from '@/lib/api';
import { format } from 'date-fns';
import { zhCN, enUS } from 'date-fns/locale';
import { Users, Trash2, Shield, ShieldCheck, Loader2, RefreshCw } from 'lucide-react';

interface UserItem {
  id: string;
  username: string;
  email: string | null;
  role: string;
  streak_days: number;
  total_study_time: number;
  created_at: string;
}

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const { t, language } = useLanguage();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<UserItem | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const dateLocale = language === 'zh-CN' ? zhCN : enUS;

  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.get<{ users: UserItem[] }>('/api/users');
      if (res.success && res.data?.users) {
        setUsers(res.data.users);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    
    setActionLoading(deleteTarget.id);
    try {
      const res = await api.delete(`/api/users/${deleteTarget.id}`);
      if (res.success) {
        setUsers(users.filter(u => u.id !== deleteTarget.id));
        setDeleteTarget(null);
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const formatStudyTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), 'PP', { locale: dateLocale });
  };

  if (currentUser?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <Shield className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">{t('user.noPermission')}</h2>
        <p className="text-muted-foreground">{t('user.adminRequired')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-7 h-7" />
            {t('user.title')}
          </h1>
          <p className="text-muted-foreground">{t('user.subtitle')}</p>
        </div>
        <Button variant="outline" onClick={fetchUsers} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {t('common.refresh')}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{users.length}</p>
                <p className="text-xs text-muted-foreground">{t('user.totalUsers')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {users.filter(u => u.role === 'admin').length}
                </p>
                <p className="text-xs text-muted-foreground">{t('user.admins')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {users.filter(u => u.role === 'user').length}
                </p>
                <p className="text-xs text-muted-foreground">{t('user.regularUsers')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('user.userList')}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('user.username')}</TableHead>
                  <TableHead>{t('user.email')}</TableHead>
                  <TableHead>{t('user.role')}</TableHead>
                  <TableHead>{t('user.streakDays')}</TableHead>
                  <TableHead>{t('user.studyTime')}</TableHead>
                  <TableHead>{t('user.createdAt')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map(user => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-white text-sm font-medium">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                        {user.username}
                        {user.id === currentUser?.id && (
                          <Badge variant="secondary" className="text-xs">
                            {t('user.you')}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.email || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'admin' ? 'default' : 'outline'}>
                        {user.role === 'admin' ? (
                          <>
                            <ShieldCheck className="w-3 h-3 mr-1" />
                            {t('user.admin')}
                          </>
                        ) : (
                          t('user.user')
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-orange-500 font-medium">
                        {user.streak_days} {t('user.days')}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatStudyTime(user.total_study_time)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(user.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      {user.id !== currentUser?.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(user)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('user.confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('user.deleteWarning', { username: deleteTarget?.username })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={actionLoading !== null}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                t('common.delete')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
