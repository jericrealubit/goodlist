import * as Crypto from 'expo-crypto';
import { useMutation, type UseMutationOptions } from '@tanstack/react-query';

import {
  cancelTask,
  completeTask,
  createRequest,
  createTask,
  deleteAllHistory,
  deleteTask,
  reopenTask,
  reorderTask,
  updateTask,
} from '@/lib/mutations/tasks';
import { groupKeys, queryClient, taskKeys } from '@/lib/query-client';
import type { GroupSummary, NewRequestInput, NewTaskInput, Task, UpdateTaskInput } from '@/lib/types';

// Every task mutation shares one scope so TanStack Query replays paused
// mutations strictly in original submission order on reconnect/relaunch.
// Without this, resumed mutations could run in parallel/out of order (e.g. a
// complete followed by a reopen replaying reversed) and leave the server row
// in the wrong final state even though the client believes it's consistent.
const TASKS_QUEUE_SCOPE = { id: 'tasks-queue' } as const;

function isUniqueViolation(err: unknown): boolean {
  return !!err && typeof err === 'object' && 'code' in err && (err as { code?: unknown }).code === '23505';
}

export function buildNewTaskInput(
  input: { title: string; notes?: string | null; due_at?: string | null },
  creatorId: string,
): NewTaskInput {
  return { id: Crypto.randomUUID(), creatorId, sortOrder: -Date.now() / 1000, ...input };
}

export function buildNewRequestInput(
  input: { title: string; notes?: string | null; due_at?: string | null; assigneeId: string; familyId: string },
  creatorId: string,
): NewRequestInput {
  return { id: Crypto.randomUUID(), creatorId, sortOrder: -Date.now() / 1000, ...input };
}

function findMemberName(familyId: string, userId: string): string | null {
  const group = queryClient.getQueryData<GroupSummary>(groupKeys.mine);
  if (!group || group.id !== familyId) return null;
  return group.members.find((m) => m.user_id === userId)?.profiles?.display_name ?? null;
}

type OpenHistoryContext = { previousOpen?: Task[]; previousHistory?: Task[] };

const createTaskMutationOptions: UseMutationOptions<Task, Error, NewTaskInput, { previousOpen?: Task[] }> = {
  mutationKey: ['tasks', 'create'],
  scope: TASKS_QUEUE_SCOPE,
  mutationFn: createTask,
  onMutate: async (input) => {
    await queryClient.cancelQueries({ queryKey: taskKeys.open });
    const previousOpen = queryClient.getQueryData<Task[]>(taskKeys.open);
    const now = new Date().toISOString();
    const optimistic: Task = {
      id: input.id,
      family_id: null,
      creator_id: input.creatorId,
      assignee_id: input.creatorId,
      title: input.title.trim(),
      notes: input.notes?.trim() || null,
      due_at: input.due_at ?? null,
      origin: 'personal',
      status: 'open',
      sort_order: input.sortOrder,
      completed_at: null,
      created_at: now,
      updated_at: now,
      creator: null,
      assignee: null,
    };
    queryClient.setQueryData<Task[]>(taskKeys.open, (old) => [optimistic, ...(old ?? [])]);
    return { previousOpen };
  },
  onError: (error, _input, context) => {
    if (isUniqueViolation(error)) return; // already synced from a prior attempt — treat as success
    if (context?.previousOpen !== undefined) queryClient.setQueryData(taskKeys.open, context.previousOpen);
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: taskKeys.open });
  },
};

const createRequestMutationOptions: UseMutationOptions<Task, Error, NewRequestInput, { previousOpen?: Task[] }> = {
  mutationKey: ['tasks', 'createRequest'],
  scope: TASKS_QUEUE_SCOPE,
  mutationFn: createRequest,
  onMutate: async (input) => {
    await queryClient.cancelQueries({ queryKey: taskKeys.open });
    const previousOpen = queryClient.getQueryData<Task[]>(taskKeys.open);
    const now = new Date().toISOString();
    const optimistic: Task = {
      id: input.id,
      family_id: input.familyId,
      creator_id: input.creatorId,
      assignee_id: input.assigneeId,
      title: input.title.trim(),
      notes: input.notes?.trim() || null,
      due_at: input.due_at ?? null,
      origin: 'requested',
      status: 'open',
      sort_order: input.sortOrder,
      completed_at: null,
      created_at: now,
      updated_at: now,
      creator: { display_name: findMemberName(input.familyId, input.creatorId) },
      assignee: { display_name: findMemberName(input.familyId, input.assigneeId) },
    };
    queryClient.setQueryData<Task[]>(taskKeys.open, (old) => [optimistic, ...(old ?? [])]);
    return { previousOpen };
  },
  onError: (error, _input, context) => {
    if (isUniqueViolation(error)) return;
    if (context?.previousOpen !== undefined) queryClient.setQueryData(taskKeys.open, context.previousOpen);
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: taskKeys.open });
  },
};

type UpdateVariables = { id: string } & UpdateTaskInput;
type UpdateContext = { previousOpen?: Task[]; previousDetail?: Task; id: string };

const updateTaskMutationOptions: UseMutationOptions<Task, Error, UpdateVariables, UpdateContext> = {
  mutationKey: ['tasks', 'update'],
  scope: TASKS_QUEUE_SCOPE,
  mutationFn: ({ id, ...input }) => updateTask(id, input),
  onMutate: async ({ id, ...input }) => {
    await Promise.all([
      queryClient.cancelQueries({ queryKey: taskKeys.open }),
      queryClient.cancelQueries({ queryKey: taskKeys.detail(id) }),
    ]);
    const previousOpen = queryClient.getQueryData<Task[]>(taskKeys.open);
    const previousDetail = queryClient.getQueryData<Task>(taskKeys.detail(id));
    const patch = (t: Task): Task => ({
      ...t,
      ...(input.title !== undefined ? { title: input.title.trim() } : {}),
      ...(input.notes !== undefined ? { notes: input.notes?.trim() || null } : {}),
      ...(input.due_at !== undefined ? { due_at: input.due_at } : {}),
    });
    queryClient.setQueryData<Task[]>(taskKeys.open, (old) => old?.map((t) => (t.id === id ? patch(t) : t)));
    queryClient.setQueryData<Task>(taskKeys.detail(id), (old) => (old ? patch(old) : old));
    return { previousOpen, previousDetail, id };
  },
  onError: (_err, _vars, context) => {
    if (!context) return;
    if (context.previousOpen !== undefined) queryClient.setQueryData(taskKeys.open, context.previousOpen);
    if (context.previousDetail !== undefined) queryClient.setQueryData(taskKeys.detail(context.id), context.previousDetail);
  },
  onSettled: (_data, _err, { id }) => {
    queryClient.invalidateQueries({ queryKey: taskKeys.open });
    queryClient.invalidateQueries({ queryKey: taskKeys.detail(id) });
  },
};

const completeTaskMutationOptions: UseMutationOptions<Task, Error, Task, OpenHistoryContext> = {
  mutationKey: ['tasks', 'complete'],
  scope: TASKS_QUEUE_SCOPE,
  mutationFn: (task) => completeTask(task.id),
  onMutate: async (task) => {
    await Promise.all([
      queryClient.cancelQueries({ queryKey: taskKeys.open }),
      queryClient.cancelQueries({ queryKey: taskKeys.history }),
    ]);
    const previousOpen = queryClient.getQueryData<Task[]>(taskKeys.open);
    const previousHistory = queryClient.getQueryData<Task[]>(taskKeys.history);
    const completedAt = new Date().toISOString();
    queryClient.setQueryData<Task[]>(taskKeys.open, (old) => old?.filter((t) => t.id !== task.id));
    queryClient.setQueryData<Task[]>(taskKeys.history, (old) => [
      { ...task, status: 'completed', completed_at: completedAt },
      ...(old ?? []),
    ]);
    return { previousOpen, previousHistory };
  },
  onError: (_err, _vars, context) => {
    if (context?.previousOpen !== undefined) queryClient.setQueryData(taskKeys.open, context.previousOpen);
    if (context?.previousHistory !== undefined) queryClient.setQueryData(taskKeys.history, context.previousHistory);
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: taskKeys.open });
    queryClient.invalidateQueries({ queryKey: taskKeys.history });
  },
};

const reopenTaskMutationOptions: UseMutationOptions<Task, Error, Task, OpenHistoryContext> = {
  mutationKey: ['tasks', 'reopen'],
  scope: TASKS_QUEUE_SCOPE,
  mutationFn: (task) => reopenTask(task.id),
  onMutate: async (task) => {
    await Promise.all([
      queryClient.cancelQueries({ queryKey: taskKeys.open }),
      queryClient.cancelQueries({ queryKey: taskKeys.history }),
    ]);
    const previousOpen = queryClient.getQueryData<Task[]>(taskKeys.open);
    const previousHistory = queryClient.getQueryData<Task[]>(taskKeys.history);
    // The task may currently live in the history cache (undo from History) or
    // nowhere in either cache (reopen from the Tasks screen's local
    // "justCompleted" animation state) — filtering history is a no-op in the
    // latter case, and either way `task` (passed by the caller) already has
    // every field needed to reinsert it into `open`.
    queryClient.setQueryData<Task[]>(taskKeys.history, (old) => old?.filter((t) => t.id !== task.id));
    queryClient.setQueryData<Task[]>(taskKeys.open, (old) => [
      { ...task, status: 'open', completed_at: null },
      ...(old ?? []),
    ]);
    return { previousOpen, previousHistory };
  },
  onError: (_err, _vars, context) => {
    if (context?.previousOpen !== undefined) queryClient.setQueryData(taskKeys.open, context.previousOpen);
    if (context?.previousHistory !== undefined) queryClient.setQueryData(taskKeys.history, context.previousHistory);
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: taskKeys.open });
    queryClient.invalidateQueries({ queryKey: taskKeys.history });
  },
};

const cancelTaskMutationOptions: UseMutationOptions<Task, Error, Task, OpenHistoryContext> = {
  mutationKey: ['tasks', 'cancel'],
  scope: TASKS_QUEUE_SCOPE,
  mutationFn: (task) => cancelTask(task.id),
  onMutate: async (task) => {
    await Promise.all([
      queryClient.cancelQueries({ queryKey: taskKeys.open }),
      queryClient.cancelQueries({ queryKey: taskKeys.history }),
    ]);
    const previousOpen = queryClient.getQueryData<Task[]>(taskKeys.open);
    const previousHistory = queryClient.getQueryData<Task[]>(taskKeys.history);
    queryClient.setQueryData<Task[]>(taskKeys.open, (old) => old?.filter((t) => t.id !== task.id));
    queryClient.setQueryData<Task[]>(taskKeys.history, (old) => [{ ...task, status: 'cancelled' }, ...(old ?? [])]);
    return { previousOpen, previousHistory };
  },
  onError: (_err, _vars, context) => {
    if (context?.previousOpen !== undefined) queryClient.setQueryData(taskKeys.open, context.previousOpen);
    if (context?.previousHistory !== undefined) queryClient.setQueryData(taskKeys.history, context.previousHistory);
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: taskKeys.open });
    queryClient.invalidateQueries({ queryKey: taskKeys.history });
  },
};

const deleteTaskMutationOptions: UseMutationOptions<void, Error, Task, OpenHistoryContext> = {
  mutationKey: ['tasks', 'delete'],
  scope: TASKS_QUEUE_SCOPE,
  mutationFn: (task) => deleteTask(task.id),
  onMutate: async (task) => {
    await Promise.all([
      queryClient.cancelQueries({ queryKey: taskKeys.open }),
      queryClient.cancelQueries({ queryKey: taskKeys.history }),
    ]);
    const previousOpen = queryClient.getQueryData<Task[]>(taskKeys.open);
    const previousHistory = queryClient.getQueryData<Task[]>(taskKeys.history);
    queryClient.setQueryData<Task[]>(taskKeys.open, (old) => old?.filter((t) => t.id !== task.id));
    queryClient.setQueryData<Task[]>(taskKeys.history, (old) => old?.filter((t) => t.id !== task.id));
    return { previousOpen, previousHistory };
  },
  onError: (_err, _vars, context) => {
    if (context?.previousOpen !== undefined) queryClient.setQueryData(taskKeys.open, context.previousOpen);
    if (context?.previousHistory !== undefined) queryClient.setQueryData(taskKeys.history, context.previousHistory);
  },
  onSettled: (_data, _err, task) => {
    queryClient.invalidateQueries({ queryKey: taskKeys.open });
    queryClient.invalidateQueries({ queryKey: taskKeys.history });
    queryClient.removeQueries({ queryKey: taskKeys.detail(task.id) });
  },
};

const deleteAllHistoryMutationOptions: UseMutationOptions<
  void,
  Error,
  { userId: string },
  { previousHistory?: Task[] }
> = {
  mutationKey: ['tasks', 'deleteAllHistory'],
  scope: TASKS_QUEUE_SCOPE,
  mutationFn: () => deleteAllHistory(),
  onMutate: async ({ userId }) => {
    await queryClient.cancelQueries({ queryKey: taskKeys.history });
    const previousHistory = queryClient.getQueryData<Task[]>(taskKeys.history);
    // RLS only lets you delete rows you created — history can include
    // completed/cancelled tasks someone else created and assigned to you, so
    // this must filter, not clear, or it hides those until the next refetch.
    queryClient.setQueryData<Task[]>(taskKeys.history, (old) => old?.filter((t) => t.creator_id !== userId) ?? old);
    return { previousHistory };
  },
  onError: (_err, _vars, context) => {
    if (context?.previousHistory !== undefined) queryClient.setQueryData(taskKeys.history, context.previousHistory);
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: taskKeys.history });
  },
};

type ReorderVariables = { id: string; sortOrder: number };

const reorderTaskMutationOptions: UseMutationOptions<void, Error, ReorderVariables, { previousOpen?: Task[] }> = {
  mutationKey: ['tasks', 'reorder'],
  scope: TASKS_QUEUE_SCOPE,
  mutationFn: ({ id, sortOrder }) => reorderTask(id, sortOrder),
  onMutate: async ({ id, sortOrder }) => {
    await queryClient.cancelQueries({ queryKey: taskKeys.open });
    const previousOpen = queryClient.getQueryData<Task[]>(taskKeys.open);
    queryClient.setQueryData<Task[]>(taskKeys.open, (old) =>
      old?.map((t) => (t.id === id ? { ...t, sort_order: sortOrder } : t)),
    );
    return { previousOpen };
  },
  onError: (_err, _vars, context) => {
    if (context?.previousOpen !== undefined) queryClient.setQueryData(taskKeys.open, context.previousOpen);
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: taskKeys.open });
  },
};

export const taskMutationOptionsByKey = {
  create: createTaskMutationOptions,
  createRequest: createRequestMutationOptions,
  update: updateTaskMutationOptions,
  complete: completeTaskMutationOptions,
  reopen: reopenTaskMutationOptions,
  cancel: cancelTaskMutationOptions,
  delete: deleteTaskMutationOptions,
  deleteAllHistory: deleteAllHistoryMutationOptions,
  reorder: reorderTaskMutationOptions,
};

export function useCreateTaskMutation() {
  return useMutation(createTaskMutationOptions);
}
export function useCreateRequestMutation() {
  return useMutation(createRequestMutationOptions);
}
export function useUpdateTaskMutation() {
  return useMutation(updateTaskMutationOptions);
}
export function useCompleteTaskMutation() {
  return useMutation(completeTaskMutationOptions);
}
export function useReopenTaskMutation() {
  return useMutation(reopenTaskMutationOptions);
}
export function useCancelTaskMutation() {
  return useMutation(cancelTaskMutationOptions);
}
export function useDeleteTaskMutation() {
  return useMutation(deleteTaskMutationOptions);
}
export function useDeleteAllHistoryMutation() {
  return useMutation(deleteAllHistoryMutationOptions);
}
export function useReorderTaskMutation() {
  return useMutation(reorderTaskMutationOptions);
}
