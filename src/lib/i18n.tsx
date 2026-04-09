'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'zh-CN' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Chinese translations
const zh: Record<string, string> = {
  // Common
  'common.save': '保存',
  'common.cancel': '取消',
  'common.delete': '删除',
  'common.edit': '编辑',
  'common.add': '添加',
  'common.confirm': '确认',
  'common.loading': '加载中...',
  'common.success': '成功',
  'common.error': '错误',

  // Auth
  'auth.login': '登录',
  'auth.register': '注册',
  'auth.logout': '退出登录',
  'auth.username': '用户名',
  'auth.password': '密码',
  'auth.email': '邮箱',
  'auth.welcomeBack': '欢迎回来',
  'auth.loginAccount': '登录你的学习账号',
  'auth.createAccount': '创建账号',
  'auth.startJourney': '开始你的学习之旅',
  'auth.loginSuccess': '登录成功',
  'auth.registerSuccess': '注册成功',
  'auth.usernameRequired': '用户名不能为空',
  'auth.passwordRequired': '密码不能为空',
  'auth.passwordMinLength': '密码至少6位',
  'auth.usernameExists': '用户名已存在',
  'auth.invalidCredentials': '用户名或密码错误',
  'auth.notLoggedIn': '请先登录',
  'auth.loginPrompt': '登录即表示同意我们的服务条款',

  // Navigation
  'nav.home': '首页',
  'nav.tasks': '任务管理',
  'nav.pomodoro': '番茄钟',
  'nav.plans': '学习计划',
  'nav.stats': '数据统计',
  'nav.recycle': '回收站',
  'nav.admin': '用户管理',

  // Dashboard
  'dashboard.greeting': '你好，{username}！',
  'dashboard.keepGoing': '今天也要加油学习哦！',
  'dashboard.checkedIn': '今日已打卡，继续保持！',
  'dashboard.streakDays': '连续打卡',
  'dashboard.totalHours': '总学习(小时)',
  'dashboard.pendingTasks': '待办任务',
  'dashboard.completedToday': '今日完成',
  'dashboard.todayPlan': '今日计划',
  'dashboard.progress': '今日完成度',
  'dashboard.studyTime': '学习时长',
  'dashboard.tasks': '完成任务',
  'dashboard.highPriority': '高优先级',
  'dashboard.viewTasks': '查看任务',
  'dashboard.makePlan': '制定计划',
  'dashboard.quickAccess': '快捷入口',
  'dashboard.startPomodoro': '开启番茄钟',
  'dashboard.addTask': '添加新任务',
  'dashboard.viewStats': '查看统计',
  'dashboard.checkIn': '今日打卡',
  'dashboard.pendingTasksTitle': '待办任务',
  'dashboard.viewAll': '查看全部',
  'dashboard.noTasks': '太棒了！',
  'dashboard.allCompleted': '所有任务都已完成',
  'dashboard.todayTip': '今日学习建议',
  'dashboard.tipContent': '建议先处理高优先级任务，合理安排番茄钟时间。完成计划后记得打卡哦！',
  'dashboard.startFocus': '开始专注',

  // Tasks
  'tasks.title': '任务管理',
  'tasks.subtitle': '高效管理你的学习任务',
  'tasks.addTask': '添加任务',
  'tasks.newTask': '添加新任务',
  'tasks.taskName': '任务名称',
  'tasks.category': '分类',
  'tasks.priority': '优先级',
  'tasks.deadline': '截止日期',
  'tasks.estimatedTime': '预计时长（分钟）',
  'tasks.createTask': '创建任务',
  'tasks.total': '总任务',
  'tasks.pending': '待开始',
  'tasks.inProgress': '进行中',
  'tasks.completed': '已完成',
  'tasks.todayProgress': '今日进度',
  'tasks.filter': '筛选',
  'tasks.sort': '排序',
  'tasks.allStatus': '全部状态',
  'tasks.allCategory': '全部分类',
  'tasks.byPriority': '按优先级',
  'tasks.byDeadline': '按截止日期',
  'tasks.noTasks': '暂无任务',
  'tasks.addFirst': '点击上方按钮添加你的第一个任务',
  'tasks.daysLeft': '{days} 天后截止',
  'tasks.today': '今天截止',
  'tasks.overdue': '已逾期 {days} 天',
  'tasks.minutes': '{minutes} 分钟',
  'tasks.clearCompleted': '清空已完成任务',
  'tasks.confirmClear': '确认清空',
  'tasks.confirmClearDesc': '确定要清空所有已完成的任务吗？清空后可在回收站恢复。',
  'tasks.editTask': '编辑任务',
  'tasks.taskCreated': '任务创建成功',
  'tasks.taskUpdated': '任务更新成功',
  'tasks.taskDeleted': '任务已移入回收站',
  'tasks.cleared': '已完成任务已清空',

  // Pomodoro
  'pomodoro.title': '番茄钟',
  'pomodoro.subtitle': '专注学习，高效进步',
  'pomodoro.settings': '设置',
  'pomodoro.focus': '专注',
  'pomodoro.shortBreak': '短休息',
  'pomodoro.longBreak': '长休息',
  'pomodoro.todayMinutes': '今日学习(分钟)',
  'pomodoro.completedFocus': '已完成专注',
  'pomodoro.totalHours': '总学习(小时)',
  'pomodoro.streakDays': '连续打卡(天)',
  'pomodoro.focusing': '专注中',
  'pomodoro.breakTime': '休息中',
  'pomodoro.pomodoroMethod': '番茄工作法',
  'pomodoro.focusWork': '专注工作',
  'pomodoro.focusDesc': '25分钟全神贯注完成任务',
  'pomodoro.shortRest': '短暂休息',
  'pomodoro.shortRestDesc': '5分钟放松身心，恢复精力',
  'pomodoro.repeat': '循环往复',
  'pomodoro.repeatDesc': '每4个番茄钟后长休息15分钟',
  'pomodoro.settingsTitle': '番茄钟设置',
  'pomodoro.settingsDesc': '自定义专注时长和休息时间',
  'pomodoro.focusDuration': '专注时长（分钟）',
  'pomodoro.shortBreakDuration': '短休息时长（分钟）',
  'pomodoro.longBreakDuration': '长休息时长（分钟）',
  'pomodoro.longBreakInterval': '长休息间隔（个番茄钟）',
  'pomodoro.selectTask': '选择专注任务',
  'pomodoro.selectTaskDesc': '选择一个任务来跟踪你的专注时间',
  'pomodoro.noTask': '不关联任务',
  'pomodoro.focusComplete': '专注完成！',
  'pomodoro.breakEnd': '休息结束',
  'pomodoro.keepGoing': '继续加油！',
  'pomodoro.settingsSaved': '设置已保存',
  'pomodoro.focusingOn': '正在专注: {task}',
  'pomodoro.noTasks': '暂无待办任务',

  // Plans
  'plans.title': '学习计划',
  'plans.subtitle': '规划今日学习，养成好习惯',
  'plans.checkIn': '今日打卡',
  'plans.streakTitle': '连续打卡天数',
  'plans.keepFocus': '保持专注',
  'plans.smallProgress': '每天进步一点点',
  'plans.weekOverview': '本周概览',
  'plans.today': '今天',
  'plans.dailyPlan': '今日学习计划',
  'plans.templates': '模板',
  'plans.clear': '清空',
  'plans.savePlan': '保存计划',
  'plans.saving': '保存中...',
  'plans.planSaved': '计划已保存',
  'plans.checkInSuccess': '打卡成功！',
  'plans.checkInStreak': '打卡成功！已连续 {days} 天',
  'plans.alreadyCheckedIn': '今天已打卡',
  'plans.calendar': '打卡日历',
  'plans.checkedDays': '绿色标记表示已打卡',
  'plans.maintainStreak': '保持连续打卡，培养学习习惯',
  'plans.persistWins': '坚持就是胜利',
  'plans.persistTip': '每天完成学习计划并打卡，21天养成好习惯。连续打卡天数越多，学习动力越强！',
  'plans.enterPlan': '制定今天的学习计划...',
  'plans.planFor': '{date} 的计划',
  'plans.noPlanYet': '暂无计划',

  // Stats
  'stats.title': '数据统计',
  'stats.subtitle': '回顾学习成果，激励持续进步',
  'stats.last7Days': '近7天',
  'stats.last14Days': '近14天',
  'stats.last30Days': '近30天',
  'stats.weekStudyTime': '本周学习时长',
  'stats.weekCompletedTasks': '本周完成任务',
  'stats.dailyAverage': '日均学习',
  'stats.streakDays': '连续打卡',
  'stats.todayOverview': '今日概览',
  'stats.today': '今天',
  'stats.studyTrend': '学习趋势',
  'stats.studyDistribution': '学习时长分布',
  'stats.achievements': '学习成就',
  'stats.noRecords': '暂无学习记录',
  'stats.tasksCompleted': '完成 {count} 个任务',
  'stats.hours': '{hours}小时',
  'stats.minutes': '{minutes}分钟',
  'stats.todayStudyTime': '学习时长',
  'stats.tasksCompleted2': '完成任务',
  'stats.pendingTasks': '待办任务',
  'stats.completionRate': '完成率',

  // Recycle Bin
  'recycle.title': '回收站',
  'recycle.subtitle': '已删除的任务可以在此恢复',
  'recycle.clearAll': '清空回收站',
  'recycle.recycleCount': '回收站任务数',
  'recycle.recoverable': '天内可恢复',
  'recycle.empty': '回收站是空的',
  'recycle.deletedItems': '删除的任务会显示在这里',
  'recycle.recoverableDays': '删除的任务会保留在回收站，30天内可以恢复',
  'recycle.restore': '恢复',
  'recycle.restoring': '恢复中...',
  'recycle.deletedAt': '删除于 {date}',
  'recycle.confirmDelete': '确认删除',
  'recycle.confirmDeleteDesc': '确定要永久删除任务「{title}」吗？此操作不可恢复。',
  'recycle.taskRestored': '任务已恢复',
  'recycle.recycleCleared': '回收站已清空',
  'recycle.taskPermanentlyDeleted': '任务已永久删除',
  'recycle.tip': '温馨提示',
  'recycle.tipContent': '删除的任务会在回收站保留30天，30天后会自动清除。请及时恢复需要的任务。',
};

// English translations
const en: Record<string, string> = {
  // Common
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.delete': 'Delete',
  'common.edit': 'Edit',
  'common.add': 'Add',
  'common.confirm': 'Confirm',
  'common.loading': 'Loading...',
  'common.success': 'Success',
  'common.error': 'Error',

  // Auth
  'auth.login': 'Login',
  'auth.register': 'Register',
  'auth.logout': 'Logout',
  'auth.username': 'Username',
  'auth.password': 'Password',
  'auth.email': 'Email',
  'auth.welcomeBack': 'Welcome back',
  'auth.loginAccount': 'Login to your learning account',
  'auth.createAccount': 'Create Account',
  'auth.startJourney': 'Start your learning journey',
  'auth.loginSuccess': 'Login successful',
  'auth.registerSuccess': 'Registration successful',
  'auth.usernameRequired': 'Username is required',
  'auth.passwordRequired': 'Password is required',
  'auth.passwordMinLength': 'Password must be at least 6 characters',
  'auth.usernameExists': 'Username already exists',
  'auth.invalidCredentials': 'Invalid username or password',
  'auth.notLoggedIn': 'Please login first',
  'auth.loginPrompt': 'By logging in, you agree to our terms of service',

  // Navigation
  'nav.home': 'Home',
  'nav.tasks': 'Tasks',
  'nav.pomodoro': 'Pomodoro',
  'nav.plans': 'Study Plans',
  'nav.stats': 'Statistics',
  'nav.recycle': 'Recycle Bin',
  'nav.admin': 'Admin',

  // Dashboard
  'dashboard.greeting': 'Hello, {username}!',
  'dashboard.keepGoing': 'Keep studying hard today!',
  'dashboard.checkedIn': 'Checked in today, keep it up!',
  'dashboard.streakDays': 'Streak Days',
  'dashboard.totalHours': 'Total Hours',
  'dashboard.pendingTasks': 'Pending Tasks',
  'dashboard.completedToday': 'Completed Today',
  'dashboard.todayPlan': "Today's Plan",
  'dashboard.progress': "Today's Progress",
  'dashboard.studyTime': 'Study Time',
  'dashboard.tasks': 'Tasks Done',
  'dashboard.highPriority': 'High Priority',
  'dashboard.viewTasks': 'View Tasks',
  'dashboard.makePlan': 'Make Plan',
  'dashboard.quickAccess': 'Quick Access',
  'dashboard.startPomodoro': 'Start Pomodoro',
  'dashboard.addTask': 'Add Task',
  'dashboard.viewStats': 'View Stats',
  'dashboard.checkIn': 'Check In',
  'dashboard.pendingTasksTitle': 'Pending Tasks',
  'dashboard.viewAll': 'View All',
  'dashboard.noTasks': 'Great job!',
  'dashboard.allCompleted': 'All tasks are completed',
  'dashboard.todayTip': "Today's Study Tip",
  'dashboard.tipContent': 'Focus on high priority tasks first. Use Pomodoro technique to stay focused. Remember to check in after completing your plan!',
  'dashboard.startFocus': 'Start Focus',

  // Tasks
  'tasks.title': 'Task Management',
  'tasks.subtitle': 'Efficiently manage your study tasks',
  'tasks.addTask': 'Add Task',
  'tasks.newTask': 'Add New Task',
  'tasks.taskName': 'Task Name',
  'tasks.category': 'Category',
  'tasks.priority': 'Priority',
  'tasks.deadline': 'Deadline',
  'tasks.estimatedTime': 'Estimated Time (minutes)',
  'tasks.createTask': 'Create Task',
  'tasks.total': 'Total Tasks',
  'tasks.pending': 'Pending',
  'tasks.inProgress': 'In Progress',
  'tasks.completed': 'Completed',
  'tasks.todayProgress': "Today's Progress",
  'tasks.filter': 'Filter',
  'tasks.sort': 'Sort',
  'tasks.allStatus': 'All Status',
  'tasks.allCategory': 'All Categories',
  'tasks.byPriority': 'By Priority',
  'tasks.byDeadline': 'By Deadline',
  'tasks.noTasks': 'No tasks yet',
  'tasks.addFirst': 'Click the button above to add your first task',
  'tasks.daysLeft': '{days} days left',
  'tasks.today': 'Due today',
  'tasks.overdue': '{days} days overdue',
  'tasks.minutes': '{minutes} min',
  'tasks.clearCompleted': 'Clear Completed',
  'tasks.confirmClear': 'Confirm Clear',
  'tasks.confirmClearDesc': 'Are you sure you want to clear all completed tasks? You can recover them from recycle bin.',
  'tasks.editTask': 'Edit Task',
  'tasks.taskCreated': 'Task created successfully',
  'tasks.taskUpdated': 'Task updated successfully',
  'tasks.taskDeleted': 'Task moved to recycle bin',
  'tasks.cleared': 'Completed tasks cleared',

  // Pomodoro
  'pomodoro.title': 'Pomodoro',
  'pomodoro.subtitle': 'Focus on learning, make progress efficiently',
  'pomodoro.settings': 'Settings',
  'pomodoro.focus': 'Focus',
  'pomodoro.shortBreak': 'Short Break',
  'pomodoro.longBreak': 'Long Break',
  'pomodoro.todayMinutes': 'Today (minutes)',
  'pomodoro.completedFocus': 'Completed Focus',
  'pomodoro.totalHours': 'Total Hours',
  'pomodoro.streakDays': 'Streak Days',
  'pomodoro.focusing': 'Focusing',
  'pomodoro.breakTime': 'Break Time',
  'pomodoro.pomodoroMethod': 'Pomodoro Technique',
  'pomodoro.focusWork': 'Focus Work',
  'pomodoro.focusDesc': '25 minutes of focused work to complete tasks',
  'pomodoro.shortRest': 'Short Rest',
  'pomodoro.shortRestDesc': '5 minutes to relax and recharge',
  'pomodoro.repeat': 'Repeat Cycle',
  'pomodoro.repeatDesc': 'Long break of 15 minutes after 4 pomodoros',
  'pomodoro.settingsTitle': 'Pomodoro Settings',
  'pomodoro.settingsDesc': 'Customize focus and break durations',
  'pomodoro.focusDuration': 'Focus Duration (minutes)',
  'pomodoro.shortBreakDuration': 'Short Break (minutes)',
  'pomodoro.longBreakDuration': 'Long Break (minutes)',
  'pomodoro.longBreakInterval': 'Long Break Interval (pomodoros)',
  'pomodoro.selectTask': 'Select Task',
  'pomodoro.selectTaskDesc': 'Choose a task to track your focus time',
  'pomodoro.noTask': 'No Task',
  'pomodoro.focusComplete': 'Focus Complete!',
  'pomodoro.breakEnd': 'Break Over',
  'pomodoro.keepGoing': 'Keep going!',
  'pomodoro.settingsSaved': 'Settings saved',
  'pomodoro.focusingOn': 'Focusing on: {task}',
  'pomodoro.noTasks': 'No pending tasks',

  // Plans
  'plans.title': 'Study Plans',
  'plans.subtitle': 'Plan your study today, build good habits',
  'plans.checkIn': 'Check In',
  'plans.streakTitle': 'Streak Days',
  'plans.keepFocus': 'Stay Focused',
  'plans.smallProgress': 'Make a little progress every day',
  'plans.weekOverview': 'Week Overview',
  'plans.today': 'Today',
  'plans.dailyPlan': "Today's Study Plan",
  'plans.templates': 'Templates',
  'plans.clear': 'Clear',
  'plans.savePlan': 'Save Plan',
  'plans.saving': 'Saving...',
  'plans.planSaved': 'Plan saved',
  'plans.checkInSuccess': 'Check-in successful!',
  'plans.checkInStreak': 'Checked in! {days} days streak',
  'plans.alreadyCheckedIn': 'Already checked in today',
  'plans.calendar': 'Check-in Calendar',
  'plans.checkedDays': 'Green markers indicate checked-in days',
  'plans.maintainStreak': 'Maintain your streak, build study habits',
  'plans.persistWins': 'Persistence leads to victory',
  'plans.persistTip': 'Complete your daily study plan and check in. It takes 21 days to build a habit. The longer your streak, the more motivated you become!',
  'plans.enterPlan': "Enter today's study plan...",
  'plans.planFor': '{date} Plan',
  'plans.noPlanYet': 'No plan yet',

  // Stats
  'stats.title': 'Statistics',
  'stats.subtitle': 'Review your progress, inspire continuous improvement',
  'stats.last7Days': 'Last 7 Days',
  'stats.last14Days': 'Last 14 Days',
  'stats.last30Days': 'Last 30 Days',
  'stats.weekStudyTime': 'Week Study Time',
  'stats.weekCompletedTasks': 'Week Completed Tasks',
  'stats.dailyAverage': 'Daily Average',
  'stats.streakDays': 'Streak Days',
  'stats.todayOverview': "Today's Overview",
  'stats.today': 'Today',
  'stats.studyTrend': 'Study Trend',
  'stats.studyDistribution': 'Study Distribution',
  'stats.achievements': 'Achievements',
  'stats.noRecords': 'No study records',
  'stats.tasksCompleted': '{count} tasks completed',
  'stats.hours': '{hours}h',
  'stats.minutes': '{minutes}m',
  'stats.todayStudyTime': 'Study Time',
  'stats.tasksCompleted2': 'Tasks Done',
  'stats.pendingTasks': 'Pending Tasks',
  'stats.completionRate': 'Completion Rate',

  // Recycle Bin
  'recycle.title': 'Recycle Bin',
  'recycle.subtitle': 'Deleted tasks can be recovered here',
  'recycle.clearAll': 'Clear All',
  'recycle.recycleCount': 'Recycled Tasks',
  'recycle.recoverable': 'days until auto-delete',
  'recycle.empty': 'Recycle bin is empty',
  'recycle.deletedItems': 'Deleted tasks will appear here',
  'recycle.recoverableDays': 'Deleted tasks are kept for 30 days, then automatically removed',
  'recycle.restore': 'Restore',
  'recycle.restoring': 'Restoring...',
  'recycle.deletedAt': 'Deleted on {date}',
  'recycle.confirmDelete': 'Confirm Delete',
  'recycle.confirmDeleteDesc': 'Are you sure you want to permanently delete "{title}"? This action cannot be undone.',
  'recycle.taskRestored': 'Task restored',
  'recycle.recycleCleared': 'Recycle bin cleared',
  'recycle.taskPermanentlyDeleted': 'Task permanently deleted',
  'recycle.tip': 'Tips',
  'recycle.tipContent': 'Deleted tasks are kept for 30 days in recycle bin. Remember to restore tasks you need before they are automatically removed.',
};

const translations = { 'zh-CN': zh, 'en': en };

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('zh-CN');

  useEffect(() => {
    // Load saved language preference
    const saved = localStorage.getItem('language') as Language;
    if (saved) {
      setLanguageState(saved);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  };

  const t = (key: string, params?: Record<string, string | number>): string => {
    const langTranslations = translations[language] || translations['zh-CN'];
    let text = langTranslations[key] || key;
    
    // Replace parameters
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, String(v));
      });
    }
    
    return text;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
