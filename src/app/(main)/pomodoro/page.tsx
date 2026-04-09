'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Timer, Play, Pause, RotateCcw, Settings, Coffee, Target, CheckCircle } from 'lucide-react';
import { studyApi } from '@/lib/api';
import { useTasks } from '@/hooks/useTasks';
import { toast } from 'sonner';
import { format } from 'date-fns';

type TimerMode = 'focus' | 'shortBreak' | 'longBreak';

interface TimerSettings {
  focusDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  sessionsBeforeLongBreak: number;
}

const DEFAULT_SETTINGS: TimerSettings = {
  focusDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  sessionsBeforeLongBreak: 4,
};

export default function PomodoroPage() {
  const { user, refreshUser } = useAuth();
  const { tasks } = useTasks();
  const [settings, setSettings] = useState<TimerSettings>(DEFAULT_SETTINGS);
  const [mode, setMode] = useState<TimerMode>('focus');
  const [timeLeft, setTimeLeft] = useState(DEFAULT_SETTINGS.focusDuration * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [todayStudyTime, setTodayStudyTime] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showTaskSelect, setShowTaskSelect] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showComplete, setShowComplete] = useState(false);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // 加载今日学习时长
  const loadTodayStats = useCallback(async () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const res = await studyApi.getRecords({ date: today });
    if (res.success && res.data) {
      const total = res.data.reduce((sum: number, record: any) => sum + record.duration, 0);
      setTodayStudyTime(total);
    }
  }, []);

  // 播放提示音
  const playSound = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.log('Audio not supported');
    }
  };

  // 计时器逻辑
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsRunning(false);
      playSound();
      
      if (mode === 'focus') {
        const newSessions = sessions + 1;
        setSessions(newSessions);
        
        // 记录学习时长
        const duration = settings.focusDuration;
        studyApi.addRecord(duration, selectedTaskId || undefined);
        setTodayStudyTime((prev) => prev + duration);
        
        // 检查是否需要长休息
        if (newSessions % settings.sessionsBeforeLongBreak === 0) {
          setMode('longBreak');
          setTimeLeft(settings.longBreakDuration * 60);
        } else {
          setMode('shortBreak');
          setTimeLeft(settings.shortBreakDuration * 60);
        }
        
        setShowComplete(true);
        setTimeout(() => setShowComplete(false), 3000);
        toast.success('太棒了！专注完成', {
          description: mode === 'focus' ? `已学习 ${duration} 分钟` : undefined
        });
      } else {
        toast.success('休息结束', { description: '继续加油！' });
        setMode('focus');
        setTimeLeft(settings.focusDuration * 60);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, timeLeft, mode, sessions, settings, selectedTaskId]);

  // 初始化
  useEffect(() => {
    loadTodayStats();
  }, [loadTodayStats]);

  // 获取当前模式的时长
  const getModeDuration = (m: TimerMode) => {
    switch (m) {
      case 'focus': return settings.focusDuration * 60;
      case 'shortBreak': return settings.shortBreakDuration * 60;
      case 'longBreak': return settings.longBreakDuration * 60;
    }
  };

  // 开始/暂停
  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  // 重置
  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(getModeDuration(mode));
  };

  // 切换模式
  const switchMode = (newMode: TimerMode) => {
    setIsRunning(false);
    setMode(newMode);
    switch (newMode) {
      case 'focus': setTimeLeft(settings.focusDuration * 60); break;
      case 'shortBreak': setTimeLeft(settings.shortBreakDuration * 60); break;
      case 'longBreak': setTimeLeft(settings.longBreakDuration * 60); break;
    }
  };

  // 保存设置
  const saveSettings = (newSettings: TimerSettings) => {
    setSettings(newSettings);
    if (!isRunning) {
      switch (mode) {
        case 'focus': setTimeLeft(newSettings.focusDuration * 60); break;
        case 'shortBreak': setTimeLeft(newSettings.shortBreakDuration * 60); break;
        case 'longBreak': setTimeLeft(newSettings.longBreakDuration * 60); break;
      }
    }
    setShowSettings(false);
    toast.success('设置已保存');
  };

  // 格式化时间
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 计算进度
  const progress = ((getModeDuration(mode) - timeLeft) / getModeDuration(mode)) * 100;

  // 模式配置
  const modeConfig = {
    focus: { label: '专注', icon: Target, color: 'text-emerald-500', bgColor: 'bg-emerald-500' },
    shortBreak: { label: '短休息', icon: Coffee, color: 'text-cyan-500', bgColor: 'bg-cyan-500' },
    longBreak: { label: '长休息', icon: Coffee, color: 'text-blue-500', bgColor: 'bg-blue-500' },
  };

  const currentConfig = modeConfig[mode];

  return (
    <div className="space-y-6 animate-in">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">番茄钟</h1>
          <p className="text-muted-foreground mt-1">专注学习，高效进步</p>
        </div>
        <Button variant="outline" onClick={() => setShowSettings(true)}>
          <Settings className="w-4 h-4 mr-2" />
          设置
        </Button>
      </div>

      {/* 今日统计 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="card-hover">
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-emerald-500">{Math.floor(todayStudyTime / 60)}</p>
            <p className="text-sm text-muted-foreground">今日学习(分钟)</p>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-cyan-500">{sessions}</p>
            <p className="text-sm text-muted-foreground">已完成专注</p>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-blue-500">{Math.floor((user?.total_study_time || 0) / 60)}</p>
            <p className="text-sm text-muted-foreground">总学习(小时)</p>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-amber-500">{user?.streak_days || 0}</p>
            <p className="text-sm text-muted-foreground">连续打卡(天)</p>
          </CardContent>
        </Card>
      </div>

      {/* 计时器主体 */}
      <Card className="overflow-hidden">
        <CardContent className="pt-8 pb-8">
          {/* 模式切换 */}
          <div className="flex justify-center gap-2 mb-8">
            {(['focus', 'shortBreak', 'longBreak'] as TimerMode[]).map((m) => {
              const config = modeConfig[m];
              const Icon = config.icon;
              return (
                <Button
                  key={m}
                  variant={mode === m ? 'default' : 'outline'}
                  className={`${mode === m ? config.bgColor : ''}`}
                  onClick={() => switchMode(m)}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {config.label}
                </Button>
              );
            })}
          </div>

          {/* 圆形进度 */}
          <div className="relative flex justify-center mb-8">
            <div className="relative w-64 h-64">
              {/* 背景圆环 */}
              <svg className="absolute inset-0 w-full h-full -rotate-90">
                <circle
                  cx="128"
                  cy="128"
                  r="120"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-muted"
                />
                <circle
                  cx="128"
                  cy="128"
                  r="120"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeLinecap="round"
                  className={`timer-ring ${currentConfig.color}`}
                  style={{
                    strokeDasharray: 754,
                    strokeDashoffset: 754 - (754 * progress) / 100,
                  }}
                />
              </svg>
              
              {/* 时间显示 */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-6xl font-bold tracking-wider">
                  {formatTime(timeLeft)}
                </span>
                <span className={`text-sm mt-2 ${currentConfig.color}`}>
                  {currentConfig.label}中
                </span>
              </div>
            </div>
          </div>

          {/* 控制按钮 */}
          <div className="flex justify-center gap-4">
            <Button
              variant="outline"
              size="lg"
              onClick={resetTimer}
              className="w-16 h-16 rounded-full"
            >
              <RotateCcw className="w-6 h-6" />
            </Button>
            <Button
              size="lg"
              onClick={toggleTimer}
              className={`w-20 h-20 rounded-full ${currentConfig.bgColor} shadow-lg hover:scale-105 transition-transform`}
            >
              {isRunning ? (
                <Pause className="w-8 h-8" />
              ) : (
                <Play className="w-8 h-8 ml-1" />
              )}
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => setShowTaskSelect(true)}
              className="w-16 h-16 rounded-full"
            >
              <Target className="w-6 h-6" />
            </Button>
          </div>

          {/* 选中的任务 */}
          {selectedTaskId && (
            <div className="mt-6 text-center">
              <Badge variant="secondary" className="text-sm">
                正在专注: {tasks.find(t => t.id === selectedTaskId)?.title || '未知任务'}
              </Badge>
            </div>
          )}

          {/* 完成提示 */}
          {showComplete && (
            <div className="mt-6 text-center animate-in">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-600">
                <CheckCircle className="w-5 h-5" />
                专注完成！
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 番茄钟说明 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">番茄工作法</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                <Target className="w-4 h-4 text-emerald-500" />
              </div>
              <div>
                <p className="font-medium">专注工作</p>
                <p className="text-muted-foreground">25分钟全神贯注完成任务</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
                <Coffee className="w-4 h-4 text-cyan-500" />
              </div>
              <div>
                <p className="font-medium">短暂休息</p>
                <p className="text-muted-foreground">5分钟放松身心，恢复精力</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                <Timer className="w-4 h-4 text-blue-500" />
              </div>
              <div>
                <p className="font-medium">循环往复</p>
                <p className="text-muted-foreground">每4个番茄钟后长休息15分钟</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 设置对话框 */}
      <SettingsDialog
        open={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onSave={saveSettings}
      />

      {/* 任务选择对话框 */}
      <TaskSelectDialog
        open={showTaskSelect}
        onClose={() => setShowTaskSelect(false)}
        tasks={tasks.filter(t => t.status !== 'completed')}
        selectedTaskId={selectedTaskId}
        onSelect={(taskId) => {
          setSelectedTaskId(taskId);
          setShowTaskSelect(false);
        }}
      />
    </div>
  );
}

// 设置对话框
function SettingsDialog({
  open,
  onClose,
  settings,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  settings: TimerSettings;
  onSave: (settings: TimerSettings) => void;
}) {
  const [localSettings, setLocalSettings] = useState(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings, open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>番茄钟设置</DialogTitle>
          <DialogDescription>自定义专注时长和休息时间</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>专注时长（分钟）</Label>
            <Input
              type="number"
              min="1"
              max="120"
              value={localSettings.focusDuration}
              onChange={(e) => setLocalSettings({ ...localSettings, focusDuration: parseInt(e.target.value) || 25 })}
            />
          </div>
          <div className="space-y-2">
            <Label>短休息时长（分钟）</Label>
            <Input
              type="number"
              min="1"
              max="30"
              value={localSettings.shortBreakDuration}
              onChange={(e) => setLocalSettings({ ...localSettings, shortBreakDuration: parseInt(e.target.value) || 5 })}
            />
          </div>
          <div className="space-y-2">
            <Label>长休息时长（分钟）</Label>
            <Input
              type="number"
              min="1"
              max="60"
              value={localSettings.longBreakDuration}
              onChange={(e) => setLocalSettings({ ...localSettings, longBreakDuration: parseInt(e.target.value) || 15 })}
            />
          </div>
          <div className="space-y-2">
            <Label>长休息间隔（个番茄钟）</Label>
            <Input
              type="number"
              min="1"
              max="10"
              value={localSettings.sessionsBeforeLongBreak}
              onChange={(e) => setLocalSettings({ ...localSettings, sessionsBeforeLongBreak: parseInt(e.target.value) || 4 })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button className="gradient-bg" onClick={() => onSave(localSettings)}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// 任务选择对话框
function TaskSelectDialog({
  open,
  onClose,
  tasks,
  selectedTaskId,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  tasks: any[];
  selectedTaskId: string | null;
  onSelect: (taskId: string | null) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>选择专注任务</DialogTitle>
          <DialogDescription>选择一个任务来跟踪你的专注时间</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-4 max-h-64 overflow-y-auto">
          <Button
            variant={selectedTaskId === null ? 'default' : 'outline'}
            className="w-full justify-start"
            onClick={() => onSelect(null)}
          >
            不关联任务
          </Button>
          {tasks.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">暂无待办任务</p>
          ) : (
            tasks.map((task) => (
              <Button
                key={task.id}
                variant={selectedTaskId === task.id ? 'default' : 'outline'}
                className="w-full justify-start"
                onClick={() => onSelect(task.id)}
              >
                {task.title}
                {task.category && (
                  <Badge variant="secondary" className="ml-2">{task.category}</Badge>
                )}
              </Button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
