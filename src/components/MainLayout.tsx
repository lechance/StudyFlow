'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { TasksProvider } from '@/hooks/useTasks';
import { useLanguage } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  BookOpen,
  Calendar,
  Home,
  LogOut,
  Menu,
  Timer,
  Trash2,
  BarChart3,
  Globe
} from 'lucide-react';

function Sidebar({ collapsed = false }: { collapsed?: boolean }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { t } = useLanguage();

  const navItems = [
    { label: t('nav.home'), href: '/dashboard', icon: Home },
    { label: t('nav.tasks'), href: '/tasks', icon: BookOpen },
    { label: t('nav.pomodoro'), href: '/pomodoro', icon: Timer },
    { label: t('nav.stats'), href: '/stats', icon: BarChart3 },
    { label: t('nav.recycle'), href: '/recycle', icon: Trash2 },
  ];

  return (
    <aside
      className={`hidden lg:sticky lg:top-0 lg:flex flex-col h-screen bg-card border-r transition-all duration-300 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 h-16 px-4 border-b">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <span className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-cyan-600 bg-clip-text text-transparent">
            StudyFlow
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="font-medium">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User Info */}
      <div className="p-3 border-t">
        <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
          <Avatar className="w-9 h-9">
            <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-cyan-500 text-white">
              {user?.username?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.username}</p>
              <p className="text-xs text-muted-foreground">
                {t('dashboard.streakDays')}: {user?.streak_days}
              </p>
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          className={`w-full mt-2 text-muted-foreground hover:text-destructive ${collapsed ? 'px-2' : ''}`}
          onClick={logout}
        >
          <LogOut className="w-4 h-4 mr-2" />
          {!collapsed && t('auth.logout')}
        </Button>
      </div>
    </aside>
  );
}

function MobileNav() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { t } = useLanguage();

  const navItems = [
    { label: t('nav.home'), href: '/dashboard', icon: Home },
    { label: t('nav.tasks'), href: '/tasks', icon: BookOpen },
    { label: t('nav.pomodoro'), href: '/pomodoro', icon: Timer },
    { label: t('nav.stats'), href: '/stats', icon: BarChart3 },
    { label: t('nav.recycle'), href: '/recycle', icon: Trash2 },
  ];

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="lg:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <div className="flex items-center gap-3 p-4 border-b">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-cyan-600 bg-clip-text text-transparent">
            StudyFlow
          </span>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t">
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="w-9 h-9">
              <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-cyan-500 text-white">
                {user?.username?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.username}</p>
              <p className="text-xs text-muted-foreground">
                {t('dashboard.streakDays')}: {user?.streak_days}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full text-muted-foreground hover:text-destructive"
            onClick={logout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            {t('auth.logout')}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function LanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === 'zh-CN' ? 'en' : 'zh-CN');
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLanguage}
      className="flex items-center gap-1.5"
      title={t('common.language')}
    >
      <Globe className="w-4 h-4" />
      <span className="text-xs font-medium">{language === 'zh-CN' ? 'EN' : '中'}</span>
    </Button>
  );
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">{t('common.loading')}</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">{t('common.loading')}</div>
      </div>
    );
  }

  if (!user) {
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    return null;
  }

  return (
    <TasksProvider>
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="sticky top-0 z-40 flex items-center justify-between h-16 px-4 bg-card/80 backdrop-blur-md border-b lg:px-6">
            <MobileNav />
            <div className="flex items-center gap-3 ml-auto">
              <LanguageSwitcher />
              <div className="hidden sm:flex items-center gap-2 text-sm">
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-200">
                  <Timer className="w-3 h-3 mr-1" />
                  {Math.floor((user.total_study_time || 0) / 60)}h {(user.total_study_time || 0) % 60}m
                </Badge>
                <Badge variant="outline" className="bg-cyan-500/10 text-cyan-600 border-cyan-200">
                  {t('dashboard.streakDays')}: {user.streak_days}
                </Badge>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-4 lg:p-6">
            {children}
          </main>
        </div>
      </div>
    </TasksProvider>
  );
}
