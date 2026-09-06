import { supabase } from '@/lib/supabase';
import type { NewRequestInput, NewTaskInput, Task, UpdateTaskInput } from '@/lib/types';

// id/sortOrder are generated client-side (see src/hooks/use-task-mutations.ts)
// so an optimistically-created row IS the final row — no server round trip
// is needed before it can be shown, and no reconciliation step is needed
// once the create actually syncs.
export async function createTask(input: NewTaskInput): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      id: input.id,
      title: input.title.trim(),
      notes: input.notes?.trim() || null,
      due_at: input.due_at ?? null,
      creator_id: input.creatorId,
      assignee_id: input.creatorId,
      origin: 'personal',
      sort_order: input.sortOrder,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function createRequest(input: NewRequestInput): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      id: input.id,
      title: input.title.trim(),
      notes: input.notes?.trim() || null,
      due_at: input.due_at ?? null,
      creator_id: input.creatorId,
      assignee_id: input.assigneeId,
      family_id: input.familyId,
      origin: 'requested',
      sort_order: input.sortOrder,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function cancelTask(id: string): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function updateTask(id: string, input: UpdateTaskInput): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .update({
      ...(input.title !== undefined ? { title: input.title.trim() } : {}),
      ...(input.notes !== undefined ? { notes: input.notes?.trim() || null } : {}),
      ...(input.due_at !== undefined ? { due_at: input.due_at } : {}),
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function completeTask(id: string): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function reopenTask(id: string): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .update({ status: 'open', completed_at: null })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function reorderTask(id: string, sortOrder: number): Promise<void> {
  const { error } = await supabase.from('tasks').update({ sort_order: sortOrder }).eq('id', id);
  if (error) throw error;
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) throw error;
}

// RLS's creator-only delete policy scopes this automatically — rows the
// current user didn't create are simply left untouched, no client-side
// filtering needed.
export async function deleteAllHistory(): Promise<void> {
  const { error } = await supabase.from('tasks').delete().in('status', ['completed', 'cancelled']);
  if (error) throw error;
}
