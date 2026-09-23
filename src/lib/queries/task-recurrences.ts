import { supabase } from '@/lib/supabase';
import type { TaskRecurrence } from '@/lib/types';

/** Every series this user owns, stopped ones included — an occurrence's editor still needs to describe its series. */
export async function listTaskRecurrences(): Promise<TaskRecurrence[]> {
  const { data, error } = await supabase
    .from('task_recurrences')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}
