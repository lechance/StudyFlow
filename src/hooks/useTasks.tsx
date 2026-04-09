'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { tasksApi } from '@/lib/api';
import type { Task } from '@/lib/types';
import { useAuth } from './useAuth';

interface TasksContextType {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  fetchTasks: (options?: { planDate?: string; planDateRange?: 'today' | 'week' | 'all' }) => Promise<void>;
  addTask: (task: Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'is_deleted'>) => Promise<boolean>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<boolean>;
  deleteTask: (id: string) => Promise<boolean>;
  clearCompleted: (ids?: string[]) => Promise<boolean>;
  recycleBin: any[];
  fetchRecycleBin: () => Promise<void>;
  restoreTask: (taskId: string) => Promise<boolean>;
  clearRecycleBin: () => Promise<boolean>;
}

const TasksContext = createContext<TasksContextType | undefined>(undefined);

export function TasksProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [recycleBin, setRecycleBin] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async (options?: { planDate?: string; planDateRange?: 'today' | 'week' | 'all' }) => {
    if (!user) {
      setTasks([]);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    const res = await tasksApi.getAll(false, options);
    if (res.success) {
      setTasks(res.data || []);
    } else {
      setError(res.error || '获取任务失败');
    }
    setLoading(false);
  }, [user]);

  const fetchRecycleBin = useCallback(async () => {
    if (!user) return;
    
    const res = await tasksApi.getRecycleBin();
    if (res.success) {
      setRecycleBin(res.data || []);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchTasks();
      fetchRecycleBin();
    }
  }, [user, fetchTasks, fetchRecycleBin]);

  const addTask = async (task: Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'is_deleted'>) => {
    const res = await tasksApi.create(task);
    if (res.success && res.data) {
      setTasks(prev => [...prev, res.data]);
      return true;
    }
    return false;
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    const res = await tasksApi.update(id, updates);
    if (res.success && res.data) {
      setTasks(prev => prev.map(t => t.id === id ? res.data : t));
      return true;
    }
    return false;
  };

  const deleteTask = async (id: string) => {
    const res = await tasksApi.delete(id);
    if (res.success) {
      setTasks(prev => prev.filter(t => t.id !== id));
      await fetchRecycleBin();
      return true;
    }
    return false;
  };

  const clearCompleted = async (ids?: string[]) => {
    const res = await tasksApi.clearCompleted(ids);
    if (res.success) {
      await fetchTasks();
      return true;
    }
    return false;
  };

  const restoreTask = async (taskId: string) => {
    const res = await tasksApi.restore(taskId);
    if (res.success) {
      await fetchTasks();
      await fetchRecycleBin();
      return true;
    }
    return false;
  };

  const clearRecycleBin = async () => {
    const res = await tasksApi.clearRecycleBin();
    if (res.success) {
      setRecycleBin([]);
      return true;
    }
    return false;
  };

  return (
    <TasksContext.Provider value={{
      tasks,
      loading,
      error,
      fetchTasks,
      addTask,
      updateTask,
      deleteTask,
      clearCompleted,
      recycleBin,
      fetchRecycleBin,
      restoreTask,
      clearRecycleBin
    }}>
      {children}
    </TasksContext.Provider>
  );
}

export function useTasks() {
  const context = useContext(TasksContext);
  if (context === undefined) {
    throw new Error('useTasks must be used within a TasksProvider');
  }
  return context;
}
