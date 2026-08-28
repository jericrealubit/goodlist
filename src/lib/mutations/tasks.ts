import { supabase } from '@/lib/supabase';
import type { NewRequestInput, NewTaskInput, Task, UpdateTaskInput } from '@/lib/types';

export async function createTask(input: NewTaskInput): Promise<Task> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in.');

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      title: input.title.trim(),
      notes: input.notes?.trim() || null,
      due_at: input.due_at ?? null,
      creator_id: user.id,
      assignee_id: user.id,
      origin: 'personal',
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function createRequest(input: NewRequestInput): Promise<Task> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in.');

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      title: input.title.trim(),
      notes: input.notes?.trim() || null,
      due_at: input.due_at ?? null,
      creator_id: user.id,
      assignee_id: input.assigneeId,
      family_id: input.familyId,
      origin: 'requested',
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

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) throw error;
}
