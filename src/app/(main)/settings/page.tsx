'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/lib/i18n';
import { usersApi, storageApi, databaseBackupApi } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { User, Mail, Signature, Lock, Loader2, CheckCircle2, AlertCircle, CheckCircle, HardDrive, Wifi, WifiOff, Database, Clock, History, RotateCcw } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Type definitions
interface BackupRecord {
  key: string;
  filename: string;
  size: number;
  created_at: string;
}

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
  const [activeSection, setActiveSection] = useState<'profile' | 'password' | 'storage'>('profile');

  // Profile form
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [signature, setSignature] = useState('');

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Storage form
  const [storageEnabled, setStorageEnabled] = useState(false);
  const [endpointUrl, setEndpointUrl] = useState('');
  const [accessKey, setAccessKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [bucketName, setBucketName] = useState('');
  const [region, setRegion] = useState('us-east-1');
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [connectionMessage, setConnectionMessage] = useState('');

  // Auto backup settings
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(false);
  const [autoBackupInterval, setAutoBackupInterval] = useState('daily');

  // Database backup state
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [lastAutoBackup, setLastAutoBackup] = useState<string | null>(null);

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

  // Load storage settings
  useEffect(() => {
    if (activeSection === 'storage' && user) {
      loadStorageSettings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection, user]);

  const loadStorageSettings = async () => {
    try {
      const res = await storageApi.getSettings();
      if (res.success && res.data) {
        setEndpointUrl(res.data.endpoint_url || '');
        setAccessKey(res.data.access_key || '');
        setBucketName(res.data.bucket_name || '');
        setRegion(res.data.region || 'us-east-1');
        setStorageEnabled(res.data.enabled === 1);
        setAutoBackupEnabled(res.data.auto_backup_enabled === 1);
        setAutoBackupInterval(res.data.auto_backup_interval || 'daily');
        setLastAutoBackup(res.data.last_auto_backup);
        setConnectionStatus(res.data.endpoint_url ? 'success' : 'idle');
        
        // Load backup list if storage is enabled
        if (res.data.enabled === 1) {
          loadBackupList();
        }
      }
    } catch (error) {
      console.error('Failed to load storage settings:', error);
    }
  };

  // Load backup list
  const loadBackupList = async () => {
    try {
      const res = await databaseBackupApi.listBackups();
      if (res.success && res.data) {
        setBackups(res.data);
      }
    } catch (error) {
      console.error('Failed to load backup list:', error);
    }
  };

  // Manual backup
  const handleManualBackup = async () => {
    if (!storageEnabled) {
      toast.error(t('settings.enableStorageFirst') || '请先启用 S3 存储');
      return;
    }

    setBackingUp(true);
    try {
      const res = await databaseBackupApi.backup();
      if (res.success) {
        toast.success(t('settings.backupSuccess') || '数据库备份成功');
        await loadBackupList();
        setLastAutoBackup(new Date().toISOString());
      } else {
        toast.error(res.error || t('settings.backupFailed') || '备份失败');
      }
    } catch {
      toast.error(t('settings.backupFailed') || '备份失败');
    } finally {
      setBackingUp(false);
    }
  };

  // Restore from backup
  const handleRestore = async (backupKey: string) => {
    if (!confirm(t('settings.confirmRestore') || '确定要从备份恢复数据库吗？当前数据将被覆盖。')) {
      return;
    }

    setRestoring(true);
    try {
      const res = await databaseBackupApi.restore(backupKey);
      if (res.success) {
        toast.success(t('settings.restoreSuccess') || '数据库恢复成功，请刷新页面');
      } else {
        toast.error(res.error || t('settings.restoreFailed') || '恢复失败');
      }
    } catch {
      toast.error(t('settings.restoreFailed') || '恢复失败');
    } finally {
      setRestoring(false);
    }
  };

  // Test storage connection
  const handleTestConnection = async () => {
    if (!endpointUrl || !accessKey || !secretKey || !bucketName) {
      toast.error(t('settings.storageRequired') || '请填写完整的 S3 配置信息');
      return;
    }

    setConnectionStatus('testing');
    setConnectionMessage('');
    
    try {
      const res = await storageApi.testConnection({
        endpoint_url: endpointUrl,
        access_key: accessKey,
        secret_key: secretKey,
        bucket_name: bucketName,
        region: region
      });

      if (res.success) {
        setConnectionStatus('success');
        setConnectionMessage(res.message || '连接成功');
        toast.success(t('settings.connectionSuccess') || '连接成功');
      } else {
        setConnectionStatus('error');
        setConnectionMessage(res.error || '连接失败');
        toast.error(res.error || t('settings.connectionFailed') || '连接失败');
      }
    } catch {
      setConnectionStatus('error');
      setConnectionMessage(t('settings.connectionFailed') || '连接失败');
      toast.error(t('settings.connectionFailed') || '连接失败');
    }
  };

  // Save storage settings
  const handleSaveStorage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!endpointUrl || !accessKey || !secretKey || !bucketName) {
      toast.error(t('settings.storageRequired') || '请填写完整的 S3 配置信息');
      return;
    }

    setLoading(true);
    try {
      const res = await storageApi.saveSettings({
        endpoint_url: endpointUrl,
        access_key: accessKey,
        secret_key: secretKey,
        bucket_name: bucketName,
        region: region,
        enabled: storageEnabled,
        auto_backup_enabled: autoBackupEnabled,
        auto_backup_interval: autoBackupInterval
      });

      if (res.success) {
        toast.success(t('settings.storageSaved') || '存储设置已保存');
      } else {
        toast.error(res.error || t('common.error'));
      }
    } catch {
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

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
        <Button
          variant={activeSection === 'storage' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveSection('storage')}
          className="gap-2"
        >
          <HardDrive className="w-4 h-4" />
          {t('settings.storage') || '数据存储'}
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

      {/* Storage Section */}
      {activeSection === 'storage' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="w-5 h-5" />
              {t('settings.storageConfig') || 'S3 存储配置'}
            </CardTitle>
            <CardDescription>
              {t('settings.storageDesc') || '配置 S3 兼容的对象存储服务，实现数据持久化'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveStorage} className="space-y-4">
              {/* Enable Switch */}
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <HardDrive className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{t('settings.enableStorage') || '启用 S3 存储'}</p>
                    <p className="text-xs text-muted-foreground">{t('settings.enableStorageDesc') || '启用后将使用 S3 存储您的数据'}</p>
                  </div>
                </div>
                <Switch
                  checked={storageEnabled}
                  onCheckedChange={setStorageEnabled}
                />
              </div>

              {/* Endpoint URL */}
              <div className="space-y-2">
                <Label htmlFor="endpoint-url">{t('settings.endpointUrl') || 'Endpoint URL'}</Label>
                <Input
                  id="endpoint-url"
                  value={endpointUrl}
                  onChange={(e) => {
                    setEndpointUrl(e.target.value);
                    setConnectionStatus('idle');
                  }}
                  placeholder="https://s3.amazonaws.com 或 https://oss-cn-*.aliyuncs.com"
                  disabled={!storageEnabled}
                />
                <p className="text-xs text-muted-foreground">
                  {t('settings.endpointHint') || '支持 AWS S3、阿里云 OSS、MinIO 等 S3 兼容存储'}
                </p>
              </div>

              {/* Access Key */}
              <div className="space-y-2">
                <Label htmlFor="access-key">{t('settings.accessKey') || 'Access Key'}</Label>
                <Input
                  id="access-key"
                  value={accessKey}
                  onChange={(e) => {
                    setAccessKey(e.target.value);
                    setConnectionStatus('idle');
                  }}
                  placeholder={t('settings.enterAccessKey') || '请输入 Access Key'}
                  disabled={!storageEnabled}
                />
              </div>

              {/* Secret Key */}
              <div className="space-y-2">
                <Label htmlFor="secret-key">{t('settings.secretKey') || 'Secret Key'}</Label>
                <Input
                  id="secret-key"
                  type="password"
                  value={secretKey}
                  onChange={(e) => {
                    setSecretKey(e.target.value);
                    setConnectionStatus('idle');
                  }}
                  placeholder={t('settings.enterSecretKey') || '请输入 Secret Key'}
                  disabled={!storageEnabled}
                />
              </div>

              {/* Bucket Name */}
              <div className="space-y-2">
                <Label htmlFor="bucket-name">{t('settings.bucketName') || 'Bucket 名称'}</Label>
                <Input
                  id="bucket-name"
                  value={bucketName}
                  onChange={(e) => {
                    setBucketName(e.target.value);
                    setConnectionStatus('idle');
                  }}
                  placeholder={t('settings.enterBucketName') || '请输入 Bucket 名称'}
                  disabled={!storageEnabled}
                />
              </div>

              {/* Region */}
              <div className="space-y-2">
                <Label htmlFor="region">{t('settings.region') || '区域'}</Label>
                <Input
                  id="region"
                  value={region}
                  onChange={(e) => {
                    setRegion(e.target.value);
                    setConnectionStatus('idle');
                  }}
                  placeholder="us-east-1"
                  disabled={!storageEnabled}
                />
              </div>

              {/* Connection Status */}
              <div className={`p-4 rounded-lg flex items-center gap-3 ${
                connectionStatus === 'success' ? 'bg-emerald-500/10' :
                connectionStatus === 'error' ? 'bg-red-500/10' :
                'bg-muted/50'
              }`}>
                {connectionStatus === 'success' ? (
                  <Wifi className="w-5 h-5 text-emerald-500" />
                ) : connectionStatus === 'error' ? (
                  <WifiOff className="w-5 h-5 text-red-500" />
                ) : (
                  <HardDrive className="w-5 h-5 text-muted-foreground" />
                )}
                <div className="flex-1">
                  <p className={`font-medium ${
                    connectionStatus === 'success' ? 'text-emerald-600' :
                    connectionStatus === 'error' ? 'text-red-600' :
                    ''
                  }`}>
                    {connectionStatus === 'success' ? (t('settings.connected') || '已连接') :
                     connectionStatus === 'error' ? (t('settings.connectionFailed') || '连接失败') :
                     (t('settings.notConnected') || '未连接')}
                  </p>
                  {connectionMessage && (
                    <p className="text-xs text-muted-foreground">{connectionMessage}</p>
                  )}
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-2">
                <Button 
                  type="button"
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={!storageEnabled || connectionStatus === 'testing' || !endpointUrl || !accessKey || !secretKey || !bucketName}
                  className="gap-2"
                >
                  {connectionStatus === 'testing' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t('settings.testing') || '测试中...'}
                    </>
                  ) : (
                    <>
                      <Wifi className="w-4 h-4" />
                      {t('settings.testConnection') || '测试连接'}
                    </>
                  )}
                </Button>
                <Button 
                  type="submit" 
                  disabled={loading || !storageEnabled}
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
                      {t('settings.save') || '保存'}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Database Backup Section */}
      {activeSection === 'storage' && storageEnabled && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              {t('settings.databaseBackup') || '数据库备份'}
            </CardTitle>
            <CardDescription>
              {t('settings.databaseBackupDesc') || '备份和恢复您的 SQLite 数据库文件'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Auto Backup Settings */}
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{t('settings.autoBackup') || '自动备份'}</p>
                    <p className="text-xs text-muted-foreground">{t('settings.autoBackupDesc') || '按设定时间自动备份数据库'}</p>
                  </div>
                </div>
                <Switch
                  checked={autoBackupEnabled}
                  onCheckedChange={setAutoBackupEnabled}
                />
              </div>

              {autoBackupEnabled && (
                <div className="space-y-2">
                  <Label>{t('settings.backupInterval') || '备份间隔'}</Label>
                  <Select value={autoBackupInterval} onValueChange={setAutoBackupInterval}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">{t('settings.hourly') || '每小时'}</SelectItem>
                      <SelectItem value="daily">{t('settings.daily') || '每天'}</SelectItem>
                      <SelectItem value="weekly">{t('settings.weekly') || '每周'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {lastAutoBackup && (
                <p className="text-xs text-muted-foreground">
                  {t('settings.lastBackup') || '上次备份'}: {new Date(lastAutoBackup).toLocaleString()}
                </p>
              )}

              <Button 
                onClick={handleManualBackup}
                disabled={backingUp || !storageEnabled}
                className="gap-2"
              >
                {backingUp ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t('settings.backingUp') || '备份中...'}
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4" />
                    {t('settings.backupNow') || '立即备份'}
                  </>
                )}
              </Button>
            </div>

            {/* Backup History */}
            <div className="space-y-3">
              <h3 className="font-medium flex items-center gap-2">
                <History className="w-4 h-4" />
                {t('settings.backupHistory') || '备份历史'}
              </h3>
              
              {backups.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  {t('settings.noBackups') || '暂无备份记录'}
                </p>
              ) : (
                <div className="space-y-2">
                  {backups.map((backup, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Database className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">
                            {backup.filename || 'database_backup.db'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(backup.created_at).toLocaleString()} - {backup.size ? `${(backup.size / 1024).toFixed(2)} KB` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRestore(backup.key || backup.filename)}
                          disabled={restoring}
                          className="gap-1"
                        >
                          <RotateCcw className="w-3 h-3" />
                          {t('settings.restore') || '恢复'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
