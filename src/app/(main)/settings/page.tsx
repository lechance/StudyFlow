'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/lib/i18n';
import { usersApi } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { User, Mail, Signature, Lock, Loader2, CheckCircle2, AlertCircle, CheckCircle } from 'lucide-react';

// 密码强度计算函数
function getPasswordStrength(password: string): { level: number; label: string; color: string } {
  if (!password) return { level: 0, label: '', color: '' };
  
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 8) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  
  if (score <= 1) return { level: 1, label: '弱', color: 'bg-red-500' };
  if (score <= 2) return { level: 2, label: '中等', color: 'bg-yellow-500' };
  if (score <= 3) return { level: 3, label: '良好', color: 'bg-emerald-500' };
  return { level: 4, label: '强', color: 'bg-green-500' };
}

export default function SettingsPage() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const { t } = useLanguage();

  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<'profile' | 'password'>('profile');

  // Profile form
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [signature, setSignature] = useState('');

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // 计算密码强度
  const passwordStrength = useMemo(() => getPasswordStrength(newPassword), [newPassword]);
  
  // 密码匹配状态
  const passwordsMatch = useMemo(() => {
    if (!confirmPassword) return null;
    return newPassword === confirmPassword;
  }, [newPassword, confirmPassword]);

  // Load user data
  useEffect(() => {
    if (user) {
      setUsername(user.username || '');
      setEmail(user.email || '');
      setSignature(user.signature || '');
    }
  }, [user]);

  // Update profile
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!username.trim()) {
      toast.error(t('settings.usernameRequired') || '用户名不能为空');
      return;
    }

    setLoading(true);
    try {
      const res = await usersApi.update(user.id, {
        username: username.trim(),
        email: email.trim() || undefined,
        signature: signature.trim() || undefined
      });

      if (res.success) {
        toast.success(t('settings.profileUpdated') || '个人信息已更新');
        await refreshUser();
      } else {
        toast.error(res.error || t('common.error'));
      }
    } catch {
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  // Update password
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!currentPassword) {
      toast.error(t('settings.currentPasswordRequired') || '请输入当前密码');
      return;
    }

    if (newPassword.length < 6) {
      toast.error(t('settings.passwordMinLength') || '新密码长度至少6位');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error(t('settings.passwordMismatch') || '两次输入的密码不一致');
      return;
    }

    setLoading(true);
    try {
      const res = await usersApi.update(user.id, {
        password: newPassword,
        currentPassword: currentPassword
      });

      if (res.success) {
        toast.success(t('settings.passwordUpdated') || '密码已更新');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        toast.error(res.error || t('common.error'));
      }
    } catch {
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">{t('settings.title') || '账户设置'}</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          {t('settings.subtitle') || '管理您的个人信息和密码'}
        </p>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-2 border-b pb-2">
        <Button
          variant={activeSection === 'profile' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveSection('profile')}
          className="gap-2"
        >
          <User className="w-4 h-4" />
          {t('settings.profile') || '个人信息'}
        </Button>
        <Button
          variant={activeSection === 'password' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveSection('password')}
          className="gap-2"
        >
          <Lock className="w-4 h-4" />
          {t('settings.password') || '修改密码'}
        </Button>
      </div>

      {/* Profile Section */}
      {activeSection === 'profile' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              {t('settings.profileInfo') || '个人信息'}
            </CardTitle>
            <CardDescription>
              {t('settings.profileDesc') || '更新您的个人资料信息'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              {/* User Info Display */}
              <div className="bg-muted/50 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-white text-lg font-bold">
                    {user?.username?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium">{user?.username}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {user?.streak_days || 0} {t('settings.streakDays') || '连续打卡'}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {Math.round((user?.total_study_time || 0) / 60)} {t('settings.minutes') || '分钟学习'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* Username */}
              <div className="space-y-2">
                <Label htmlFor="username">{t('settings.username') || '用户名'}</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={t('settings.enterUsername') || '请输入用户名'}
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {t('settings.email') || '邮箱'}
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('settings.enterEmail') || '请输入邮箱（选填）'}
                />
              </div>

              {/* Signature */}
              <div className="space-y-2">
                <Label htmlFor="signature" className="flex items-center gap-2">
                  <Signature className="w-4 h-4" />
                  {t('settings.signature') || '个性签名'}
                </Label>
                <Textarea
                  id="signature"
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  placeholder={t('settings.enterSignature') || '介绍一下自己吧（选填）'}
                  rows={3}
                  maxLength={200}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {signature.length}/200
                </p>
              </div>

              <Button type="submit" disabled={loading} className="gap-2">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t('common.loading')}
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    {t('settings.save') || '保存'}
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Password Section */}
      {activeSection === 'password' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              {t('settings.changePassword') || '修改密码'}
            </CardTitle>
            <CardDescription>
              {t('settings.passwordDesc') || '更新您的账户密码'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              {/* Current Password */}
              <div className="space-y-2">
                <Label htmlFor="current-password">{t('settings.currentPassword') || '当前密码'}</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder={t('settings.enterCurrentPassword') || '请输入当前密码'}
                  autoComplete="current-password"
                />
              </div>

              {/* New Password */}
              <div className="space-y-2">
                <Label htmlFor="new-password">{t('settings.newPassword') || '新密码'}</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t('settings.enterNewPassword') || '请输入新密码（至少6位）'}
                  autoComplete="new-password"
                />
                {/* 密码强度指示器 */}
                {newPassword && (
                  <div className="space-y-1">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((level) => (
                        <div
                          key={level}
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            level <= passwordStrength.level ? passwordStrength.color : 'bg-muted'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      密码强度: <span className={passwordStrength.level >= 3 ? 'text-emerald-500' : passwordStrength.level >= 2 ? 'text-yellow-500' : 'text-red-500'}>{passwordStrength.label}</span>
                      {newPassword.length < 6 && <span className="text-red-500 ml-1">(至少6位)</span>}
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirm-password">{t('settings.confirmPassword') || '确认密码'}</Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t('settings.enterConfirmPassword') || '请再次输入新密码'}
                    autoComplete="new-password"
                    className={passwordsMatch === false ? 'border-red-500 pr-10' : passwordsMatch === true ? 'border-emerald-500 pr-10' : ''}
                  />
                  {confirmPassword && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {passwordsMatch === true ? (
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                  )}
                </div>
                {passwordsMatch === false && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {t('settings.passwordMismatch') || '两次输入的密码不一致'}
                  </p>
                )}
              </div>

              <Button 
                type="submit" 
                disabled={loading || (!!confirmPassword && !passwordsMatch)} 
                className="gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t('common.loading')}
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    {t('settings.updatePassword') || '更新密码'}
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
