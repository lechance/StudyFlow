'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/lib/i18n';
import versionInfo from '@/lib/version.json';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, GraduationCap, Loader2 } from 'lucide-react';

// 禁用注册功能 - 设为 true 则关闭注册
const DISABLE_REGISTRATION = true;

function LoginForm() {
  const router = useRouter();
  const { login, register } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Login form
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Register form
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regEmail, setRegEmail] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    if (!loginUsername.trim() || !loginPassword.trim()) {
      setError(t('auth.usernameRequired'));
      setLoading(false);
      return;
    }
    
    try {
      const result = await login(loginUsername, loginPassword);
      
      if (result.success) {
        // 短暂延迟确保 Cookie 被保存后再跳转
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 100);
      } else {
        setError(result.error || t('auth.invalidCredentials'));
      }
    } catch {
      setError(t('common.error'));
    }
    
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    if (!regUsername || !regPassword) {
      setError(t('auth.usernameRequired'));
      setLoading(false);
      return;
    }
    
    if (regPassword.length < 6) {
      setError(t('auth.passwordMinLength'));
      setLoading(false);
      return;
    }
    
    const result = await register(regUsername, regPassword, regEmail || undefined);
    if (result.success) {
      // 短暂延迟确保 Cookie 被保存后再跳转
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 100);
    } else {
      setError(result.error || t('common.error'));
    }
    
    setLoading(false);
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-emerald-50 via-cyan-50 to-blue-50">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-emerald-200/30 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-cyan-200/30 blur-3xl" />
      </div>
      
      {/* Version info - bottom left */}
      <div className="fixed bottom-4 left-4 text-xs text-muted-foreground/60">
        {versionInfo.version}
      </div>
      
      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 shadow-lg mb-4">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-cyan-600 bg-clip-text text-transparent">
            StudyFlow
          </h1>
          <p className="text-muted-foreground mt-2">
            {t('login.tagline')}
          </p>
        </div>

        <Card className="shadow-xl border-0 glass">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className={`w-full mb-4 ${DISABLE_REGISTRATION ? 'grid-cols-1' : 'grid-cols-2'}`}>
              <TabsTrigger value="login">{t('auth.login')}</TabsTrigger>
              {!DISABLE_REGISTRATION && <TabsTrigger value="register">{t('auth.register')}</TabsTrigger>}
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl">{t('auth.welcomeBack')}</CardTitle>
                  <CardDescription>{t('auth.loginAccount')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {error && (
                    <div className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">
                      {error}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="login-username">{t('auth.username')}</Label>
                    <Input
                      id="login-username"
                      placeholder={t('login.enterUsername')}
                      value={loginUsername}
                      onChange={(e) => setLoginUsername(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">{t('auth.password')}</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder={t('login.enterPassword')}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                      className="mb-4"
                    />
                  </div>
                </CardContent>
                <CardFooter className="pt-2">
                  <Button 
                    type="submit" 
                    className="w-full gradient-bg" 
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('common.loading')}
                      </>
                    ) : (
                      <>
                        <BookOpen className="mr-2 h-4 w-4" />
                        {t('auth.login')}
                      </>
                    )}
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>
            {!DISABLE_REGISTRATION ? (
              <TabsContent value="register">
                <form onSubmit={handleRegister}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl">{t('auth.createAccount')}</CardTitle>
                    <CardDescription>{t('auth.startJourney')}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {error && (
                      <div className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">
                        {error}
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="reg-username">{t('auth.username')} *</Label>
                      <Input
                        id="reg-username"
                        placeholder={t('login.enterUsername')}
                        value={regUsername}
                        onChange={(e) => setRegUsername(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-email">{t('auth.email')} ({t('login.optional')})</Label>
                      <Input
                        id="reg-email"
                        type="email"
                        placeholder={t('login.enterEmail')}
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-password">{t('auth.password')} *</Label>
                      <Input
                        id="reg-password"
                        type="password"
                        placeholder={t('login.enterPasswordMin')}
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button type="submit" className="w-full gradient-bg" disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t('common.loading')}
                        </>
                      ) : (
                        <>
                          <GraduationCap className="mr-2 h-4 w-4" />
                          {t('auth.register')}
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </form>
              </TabsContent>
            ) : null}
          </Tabs>
        </Card>

        {/* Notice */}
        <p className="text-center text-sm text-muted-foreground mt-4">
          {t('auth.loginPrompt')}
        </p>
      </div>
    </div>
  );
}

// 主页面组件，包装 LoginForm 以支持 useRouter
export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [initialLoading, setInitialLoading] = useState(true);

  // 等待客户端 hydration
  useEffect(() => {
    setInitialLoading(false);
  }, []);

  // 如果用户已登录且 auth 加载完成，重定向到 dashboard
  useEffect(() => {
    if (!initialLoading && !loading && user) {
      router.push('/dashboard');
    }
  }, [initialLoading, loading, user, router]);

  // 在 hydration 完成前显示 loading
  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
