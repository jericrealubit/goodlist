import { supabase } from '@/lib/supabase';
import type { Task } from '@/lib/types';

const TASK_SELECT =
  '*, creator:profiles!tasks_creator_profile_fk(display_name), assignee:profiles!tasks_assignee_profile_fk(display_name)';

export async function listOpenTasks(): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select(TASK_SELECT)
    .eq('status', 'open')
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function listHistory(): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select(TASK_SELECT)
    .in('status', ['completed', 'cancelled'])
    .order('completed_at', { ascending: false, nullsFirst: false });

  if (error) throw error;
  return data ?? [];
}

export async function getTask(id: string): Promise<Task | null> {
  const { data, error } = await supabase.from('tasks').select(TASK_SELECT).eq('id', id).maybeSingle();

  if (error) throw error;
  return data;
}
