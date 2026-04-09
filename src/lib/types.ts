export interface User {
  id: string;
  username: string;
  password: string;
  email?: string;
  role: 'admin' | 'user';
  avatar?: string;
  streak_days: number;
  total_study_time: number;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed';
  deadline?: string;
  plan_date?: string;
  estimated_time?: number;
  completed_at?: string;
  is_deleted: number;
  created_at: string;
  updated_at: string;
  // Subtask fields (added at runtime)
  subtasks?: Subtask[];
  subtask_progress?: number;
  subtask_completed?: number;
  subtask_total?: number;
}

export interface StudyRecord {
  id: string;
  user_id: string;
  task_id?: string;
  duration: number;
  date: string;
  created_at: string;
}

export interface DailyPlan {
  id: string;
  user_id: string;
  date: string;
  content: string;
  completed: number;
  created_at: string;
  updated_at: string;
}

export interface CheckIn {
  id: string;
  user_id: string;
  date: string;
  streak: number;
  created_at: string;
}

export interface PomodoroSettings {
  id: string;
  user_id: string;
  focus_duration: number;
  break_duration: number;
  long_break_duration: number;
  sessions_before_long_break: number;
  created_at: string;
  updated_at: string;
}

export interface RecycleBinItem {
  id: string;
  user_id: string;
  task_id: string;
  task_data: string;
  deleted_at: string;
}

export interface Subtask {
  id: string;
  task_id: string;
  user_id: string;
  title: string;
  completed: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// API 响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 统计数据类型
export interface DailyStats {
  date: string;
  total_study_time: number;
  completed_tasks: number;
  planned_tasks: number;
}

// 任务分类
export const TASK_CATEGORIES = [
  '学习',
  '工作',
  '阅读',
  '运动',
  '其他'
] as const;

export type TaskCategory = typeof TASK_CATEGORIES[number];

// 优先级映射
export const PRIORITY_CONFIG = {
  high: { label: '高', color: 'bg-red-500', textColor: 'text-red-500' },
  medium: { label: '中', color: 'bg-yellow-500', textColor: 'text-yellow-500' },
  low: { label: '低', color: 'bg-green-500', textColor: 'text-green-500' }
} as const;

// 状态映射
export const STATUS_CONFIG = {
  pending: { label: '待办', color: 'bg-slate-400', textColor: 'text-slate-600' },
  in_progress: { label: '进行中', color: 'bg-blue-500', textColor: 'text-blue-500' },
  completed: { label: '已完成', color: 'bg-green-500', textColor: 'text-green-500' }
} as const;
