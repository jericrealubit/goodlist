import { supabase } from '@/lib/supabase';
import type { RecurrenceInput } from '@/lib/types';

/**
 * Series writes go through RPCs (supabase/schema.sql, "task_recurrences"),
 * because each one has to touch the series and its occurrences together:
 * turning a task into a series links it as the first occurrence, and editing
 * or stopping one clears out the future occurrences it no longer wants.
 */

function toArgs(input: RecurrenceInput) {
  return {
    p_title: input.title.trim(),
    p_notes: input.notes?.trim() || null,
    p_frequency: input.frequency,
    p_days_of_week: input.frequency === 'custom' ? input.days_of_week : null,
    p_start_date: input.start_date,
    p_due_time: input.due_time,
    p_end_date: input.end_date,
    p_alarm_enabled: input.alarm_enabled,
  };
}

export type CreateRecurrenceVariables = RecurrenceInput & {
  /** Client-generated, so an offline retry doesn't make a second series. */
  id: string;
  /** The task that becomes the first occurrence. */
  taskId: string;
};

export async function createTaskRecurrence({ id, taskId, ...input }: CreateRecurrenceVariables): Promise<void> {
  const { error } = await supabase.rpc('create_task_recurrence', { p_id: id, p_task_id: taskId, ...toArgs(input) });
  if (error) throw error;
}

export type UpdateRecurrenceVariables = RecurrenceInput & {
  id: string;
  /** Today, locally: open occurrences from here on are regenerated. */
  from: string;
};

export async function updateTaskRecurrence({ id, from, ...input }: UpdateRecurrenceVariables): Promise<void> {
  const { error } = await supabase.rpc('update_task_recurrence', { p_id: id, p_from: from, ...toArgs(input) });
  if (error) throw error;
}

export type StopRecurrenceVariables = {
  id: string;
  /** Today, locally: open occurrences after it go; today's stays. */
  after: string;
};

export async function stopTaskRecurrence({ id, after }: StopRecurrenceVariables): Promise<void> {
  const { error } = await supabase.rpc('stop_task_recurrence', { p_id: id, p_after: after });
  if (error) throw error;
}

export type OccurrenceRow = {
  id: string;
  creator_id: string;
  assignee_id: string;
  origin: 'personal';
  title: string;
  notes: string | null;
  due_at: string;
  alarm_enabled: boolean;
  sort_order: number;
  recurrence_id: string;
  occurrence_date: string;
};

/**
 * Inserts whichever of `rows` don't exist yet. The (recurrence_id,
 * occurrence_date) constraint turns every duplicate into a no-op, so two
 * devices syncing at once, or a sync that runs twice, can't make doubles —
 * and this never needs to know which occurrences are already there.
 */
export async function materializeOccurrences(rows: OccurrenceRow[]): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await supabase
    .from('tasks')
    .upsert(rows, { onConflict: 'recurrence_id,occurrence_date', ignoreDuplicates: true });
  if (error) throw error;
}
