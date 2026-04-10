'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, GraduationCap, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const { login, register } = useAuth();
  const { t } = useLanguage();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Login form
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Register form
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regEmail, setRegEmail] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!loginUsername || !loginPassword) {
      setError(t('auth.usernameRequired'));
      return;
    }
    
    setLoading(true);
    setError('');
    
    const result = await login(loginUsername, loginPassword);
    if (result.success) {
      window.location.href = '/dashboard';
    } else {
      setError(result.error || t('auth.invalidCredentials'));
    }
    
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!regUsername || !regPassword) {
      setError(t('auth.usernameRequired'));
      return;
    }
    
    if (regPassword.length < 6) {
      setError(t('auth.passwordMinLength'));
      return;
    }
    
    setLoading(true);
    setError('');
    
    const result = await register(regUsername, regPassword, regEmail || undefined);
    if (result.success) {
      window.location.href = '/dashboard';
    } else {
      setError(result.error || t('common.error'));
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-emerald-50 via-cyan-50 to-blue-50">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-emerald-200/30 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-cyan-200/30 blur-3xl" />
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

        <Card className="shadow-xl border-0">
          {/* Tab Switcher */}
          <div className="flex border-b">
            <button
              type="button"
              onClick={() => { setIsLogin(true); setError(''); }}
              className={`flex-1 py-3 text-center font-medium transition-colors ${
                isLogin 
                  ? 'text-primary border-b-2 border-primary' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t('auth.login')}
            </button>
            <button
              type="button"
              onClick={() => { setIsLogin(false); setError(''); }}
              className={`flex-1 py-3 text-center font-medium transition-colors ${
                !isLogin 
                  ? 'text-primary border-b-2 border-primary' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t('auth.register')}
            </button>
          </div>

          {isLogin ? (
            // Login Form
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
                  />
                </div>
              </CardContent>
              <CardFooter>
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
          ) : (
            // Register Form
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
          )}
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-4">
          {isLogin ? t('auth.loginPrompt') : t('auth.alreadyHaveAccount')}
        </p>
      </div>
    </div>
  );
}
