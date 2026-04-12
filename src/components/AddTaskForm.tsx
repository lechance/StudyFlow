'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useLanguage } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DialogFooter,
} from '@/components/ui/dialog';

interface AddTaskFormProps {
  onSubmit: (data: {
    title: string;
    category: string;
    priority: 'high' | 'medium' | 'low';
    deadline?: string;
    plan_date?: string;
    estimated_time?: number;
  }) => Promise<boolean>;
  onCancel: () => void;
}

const categoryKeys = ['study', 'work', 'reading', 'exercise', 'other'];

export function AddTaskForm({ onSubmit, onCancel }: AddTaskFormProps) {
  const { t } = useLanguage();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('study');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [planDate, setPlanDate] = useState('');
  const [deadline, setDeadline] = useState('');
  const [estimatedTime, setEstimatedTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) return;
    
    setIsSubmitting(true);
    const success = await onSubmit({
      title: title.trim(),
      category,
      priority,
      deadline: deadline || undefined,
      plan_date: planDate || undefined,
      estimated_time: estimatedTime ? parseInt(estimatedTime) : undefined
    });
    setIsSubmitting(false);
    
    if (success) {
      // Reset form
      setTitle('');
      setCategory('study');
      setPriority('medium');
      setPlanDate('');
      setDeadline('');
      setEstimatedTime('');
    }
  }, [title, category, priority, deadline, planDate, estimatedTime, onSubmit]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  return (
    <>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label>{t('tasks.taskName')} *</Label>
          <Input
            ref={inputRef}
            placeholder={t('common.enterTaskName')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSubmitting}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t('tasks.category')}</Label>
            <Select value={category} onValueChange={setCategory} disabled={isSubmitting}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categoryKeys.map((key) => (
                  <SelectItem key={key} value={key}>{t(`category.${key}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t('tasks.priority')}</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as 'high' | 'medium' | 'low')} disabled={isSubmitting}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">{t('priority.high')}</SelectItem>
                <SelectItem value="medium">{t('priority.medium')}</SelectItem>
                <SelectItem value="low">{t('priority.low')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t('tasks.planDate')}</Label>
            <Input
              type="date"
              value={planDate}
              onChange={(e) => setPlanDate(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('tasks.deadline')}</Label>
            <Input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>{t('tasks.estimatedTime')}</Label>
          <Input
            type="number"
            placeholder="30"
            min="1"
            value={estimatedTime}
            onChange={(e) => setEstimatedTime(e.target.value)}
            disabled={isSubmitting}
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
          {t('common.cancel')}
        </Button>
        <Button 
          className="gradient-bg" 
          onClick={handleSubmit}
          disabled={!title.trim() || isSubmitting}
        >
          {isSubmitting ? t('common.loading') : t('tasks.createTask')}
        </Button>
      </DialogFooter>
    </>
  );
}
