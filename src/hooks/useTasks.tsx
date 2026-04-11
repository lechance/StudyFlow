'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { tasksApi } from '@/lib/api';
import type { Task } from '@/lib/types';
import { useAuth } from './useAuth';

interface TasksContextType {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  fetchTasks: () => Promise<void>;
  addTask: (task: Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'is_deleted'>) => Promise<boolean>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<boolean>;
  deleteTask: (id: string) => Promise<boolean>;
  clearCompleted: (ids?: string[]) => Promise<boolean>;
  recycleBin: any[];
  fetchRecycleBin: () => Promise<void>;
  restoreTask: (taskId: string) => Promise<boolean>;
  clearRecycleBin: () => Promise<boolean>;
  permanentDeleteTask: (recycleItemId: string) => Promise<boolean>;
}

const TasksContext = createContext<TasksContextType | undefined>(undefined);

export function TasksProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [recycleBin, setRecycleBin] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isFetched = useRef(false);

  const fetchTasks = useCallback(async () => {
    if (!user) {
      setTasks([]);
      return;
    }
    
    // Avoid duplicate fetching
    if (isFetched.current && !loading) {
      return;
    }
    
    setLoading(true);
    setError(null);
    
    const res = await tasksApi.getAll(false);
    if (res.success) {
      setTasks(res.data || []);
      isFetched.current = true;
    } else {
      setError(res.error || '获取任务失败');
    }
    setLoading(false);
  }, [user, loading]);

  const fetchRecycleBin = useCallback(async () => {
    if (!user) return;
    
    const res = await tasksApi.getRecycleBin();
    if (res.success) {
      setRecycleBin(res.data || []);
    }
  }, [user]);

  useEffect(() => {
    if (user && !isFetched.current) {
      fetchTasks();
      fetchRecycleBin();
    }
    
    // Reset on logout
    if (!user) {
      isFetched.current = false;
      setTasks([]);
      setRecycleBin([]);
    }
  }, [user, fetchTasks, fetchRecycleBin]);

  const addTask = async (task: Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'is_deleted'>) => {
    const res = await tasksApi.create(task);
    if (res.success && res.data) {
      // Optimistically add task to local state
      setTasks(prev => [res.data, ...prev]);
      return true;
    }
    return false;
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    const res = await tasksApi.update(id, updates);
    if (res.success && res.data) {
      // Optimistically update task in local state
      setTasks(prev => prev.map(t => t.id === id ? { ...t, ...res.data } : t));
      return true;
    }
    return false;
  };

  const deleteTask = async (id: string) => {
    const res = await tasksApi.delete(id);
    if (res.success) {
      // Optimistically remove task from local state
      setTasks(prev => prev.filter(t => t.id !== id));
      // Update recycle bin
      await fetchRecycleBin();
      return true;
    }
    return false;
  };

  const clearCompleted = async (ids?: string[]) => {
    const res = await tasksApi.clearCompleted(ids);
    if (res.success) {
      // Optimistically remove completed tasks from local state
      const completedIds = ids || [];
      setTasks(prev => prev.filter(t => !t.status || (t.status !== 'completed' && !completedIds.includes(t.id))));
      return true;
    }
    return false;
  };

  const restoreTask = async (taskId: string) => {
    const res = await tasksApi.restore(taskId);
    if (res.success) {
      // Refresh both lists
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

  const permanentDeleteTask = async (recycleItemId: string) => {
    const res = await tasksApi.permanentDelete(recycleItemId);
    if (res.success) {
      // Refresh recycle bin
      await fetchRecycleBin();
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
      clearRecycleBin,
      permanentDeleteTask
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
