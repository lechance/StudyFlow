import type { ApiResponse } from './types';

const API_BASE = '/api';

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API Error:', error);
    return {
      success: false,
      error: '网络请求失败',
    };
  }
}

// 认证 API
export const authApi = {
  register: (username: string, password: string, email?: string) =>
    fetchApi<any>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password, email }),
    }),

  login: (username: string, password: string) =>
    fetchApi<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  logout: () =>
    fetchApi('/auth/logout', { method: 'POST' }),

  getCurrentUser: () =>
    fetchApi<any>('/auth/me'),
};

// 任务 API
export const tasksApi = {
  getAll: (includeDeleted = false) =>
    fetchApi<any[]>(`/tasks?includeDeleted=${includeDeleted}`),

  getById: (id: string) =>
    fetchApi<any>(`/tasks/${id}`),

  create: (task: {
    title: string;
    category?: string;
    priority?: string;
    deadline?: string;
    estimated_time?: number;
  }) =>
    fetchApi<any>('/tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    }),

  update: (id: string, task: Partial<any>) =>
    fetchApi<any>(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(task),
    }),

  delete: (id: string) =>
    fetchApi(`/tasks/${id}`, { method: 'DELETE' }),

  clearCompleted: (ids?: string[]) =>
    fetchApi('/tasks', {
      method: 'DELETE',
      body: JSON.stringify({ ids }),
    }),

  getRecycleBin: () =>
    fetchApi<any[]>('/tasks/recycle'),

  restore: (taskId: string) =>
    fetchApi('/tasks/recycle/restore', {
      method: 'POST',
      body: JSON.stringify({ taskId }),
    }),

  clearRecycleBin: () =>
    fetchApi('/tasks/recycle/clear', { method: 'DELETE' }),
};

// 学习记录 API
export const studyApi = {
  getRecords: (params?: { date?: string; startDate?: string; endDate?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.date) searchParams.set('date', params.date);
    if (params?.startDate) searchParams.set('startDate', params.startDate);
    if (params?.endDate) searchParams.set('endDate', params.endDate);
    const query = searchParams.toString();
    return fetchApi<any[]>(`/study/records${query ? `?${query}` : ''}`);
  },

  addRecord: (duration: number, taskId?: string, date?: string) =>
    fetchApi<any>('/study/records', {
      method: 'POST',
      body: JSON.stringify({ duration, task_id: taskId, date }),
    }),
};

// 每日计划 API
export const plansApi = {
  getPlans: (params?: { date?: string; startDate?: string; endDate?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.date) searchParams.set('date', params.date);
    if (params?.startDate) searchParams.set('startDate', params.startDate);
    if (params?.endDate) searchParams.set('endDate', params.endDate);
    const query = searchParams.toString();
    return fetchApi<any[]>(`/plans${query ? `?${query}` : ''}`);
  },

  savePlan: (date: string, content: string) =>
    fetchApi<any>('/plans', {
      method: 'POST',
      body: JSON.stringify({ date, content }),
    }),

  getCheckIns: (days = 7) =>
    fetchApi<any>(`/plans/checkin?days=${days}`),

  checkIn: (date?: string) =>
    fetchApi<any>('/plans/checkin', {
      method: 'POST',
      body: JSON.stringify({ date }),
    }),
};

// 统计数据 API
export const statsApi = {
  getStats: (days = 7) =>
    fetchApi<any>(`/stats?days=${days}`),
};

// 用户管理 API
export const usersApi = {
  getAll: () =>
    fetchApi<any[]>('/users'),

  delete: (id: string) =>
    fetchApi(`/users/${id}`, { method: 'DELETE' }),
};

// 子任务 API
export const subtasksApi = {
  getByTaskId: (taskId: string) =>
    fetchApi<any[]>(`/subtasks?taskId=${taskId}`),

  create: (taskId: string, title: string, sortOrder?: number) =>
    fetchApi<any>('/subtasks', {
      method: 'POST',
      body: JSON.stringify({ taskId, title, sortOrder }),
    }),

  update: (id: string, data: { completed?: number; title?: string; sortOrder?: number }) =>
    fetchApi<any>('/subtasks', {
      method: 'PUT',
      body: JSON.stringify({ id, ...data }),
    }),

  delete: (id: string) =>
    fetchApi(`/subtasks?id=${id}`, { method: 'DELETE' }),
};

// Combined API object for easier access
export const api = {
  get: async <T = any>(endpoint: string): Promise<ApiResponse<T>> => {
    return fetchApi<T>(endpoint);
  },
  post: async <T = any>(endpoint: string, data: any): Promise<ApiResponse<T>> => {
    return fetchApi<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  put: async <T = any>(endpoint: string, data: any): Promise<ApiResponse<T>> => {
    return fetchApi<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  del: async <T = any>(endpoint: string): Promise<ApiResponse<T>> => {
    return fetchApi<T>(endpoint, { method: 'DELETE' });
  },
  ...authApi,
  ...tasksApi,
  ...studyApi,
  ...plansApi,
  ...statsApi,
  ...usersApi,
  ...subtasksApi,
};
