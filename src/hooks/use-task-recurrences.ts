import * as Crypto from 'expo-crypto';
import { useIsMutating, useMutation, useQuery, type UseMutationOptions } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useSession } from '@/contexts/session-context';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { TASKS_QUEUE_SCOPE } from '@/hooks/use-task-mutations';
import { fromDayKey, toDayKey } from '@/lib/calendar/day';
import { parseTime } from '@/lib/medications/schedule';
import {
  createTaskRecurrence,
  materializeOccurrences,
  stopTaskRecurrence,
  updateTaskRecurrence,
  type CreateRecurrenceVariables,
  type OccurrenceRow,
  type StopRecurrenceVariables,
  type UpdateRecurrenceVariables,
} from '@/lib/mutations/task-recurrences';
import { listTaskRecurrences } from '@/lib/queries/task-recurrences';
import { queryClient, taskKeys } from '@/lib/query-client';
import { occurrenceDates, usesDaysOfWeek } from '@/lib/tasks/recurrence';
import type { Task, TaskRecurrence } from '@/lib/types';

/** Every series mutation sits under this key, so the sync can tell one is still in flight. */
const RECURRENCE_MUTATION_KEY = ['tasks', 'recurrence'] as const;

export function useTaskRecurrencesQuery() {
  return useQuery({ queryKey: taskKeys.recurrences, queryFn: listTaskRecurrences });
}

export function newRecurrenceId(): string {
  return Crypto.randomUUID();
}

type Snapshot = { recurrences?: TaskRecurrence[]; open?: Task[] };

async function snapshot(): Promise<Snapshot> {
  await Promise.all([
    queryClient.cancelQueries({ queryKey: taskKeys.recurrences }),
    queryClient.cancelQueries({ queryKey: taskKeys.open }),
  ]);
  return {
    recurrences: queryClient.getQueryData<TaskRecurrence[]>(taskKeys.recurrences),
    open: queryClient.getQueryData<Task[]>(taskKeys.open),
  };
}

function restore(context: Snapshot | undefined) {
  if (!context) return;
  if (context.recurrences !== undefined) queryClient.setQueryData(taskKeys.recurrences, context.recurrences);
  if (context.open !== undefined) queryClient.setQueryData(taskKeys.open, context.open);
}

function settle() {
  queryClient.invalidateQueries({ queryKey: ['tasks'] });
}

const createRecurrenceMutationOptions: UseMutationOptions<void, Error, CreateRecurrenceVariables, Snapshot> = {
  mutationKey: [...RECURRENCE_MUTATION_KEY, 'create'],
  scope: TASKS_QUEUE_SCOPE,
  mutationFn: createTaskRecurrence,
  onMutate: async ({ id, taskId, ...input }) => {
    const context = await snapshot();
    const now = new Date().toISOString();
    const series: TaskRecurrence = {
      id,
      creator_id: '',
      ...input,
      days_of_week: usesDaysOfWeek(input.frequency) ? input.days_of_week : null,
      month_day: input.frequency === 'monthly' ? input.month_day : null,
      month_week: input.frequency === 'monthly_weekday' ? input.month_week : null,
      skipped_dates: [],
      active: true,
      created_at: now,
      updated_at: now,
    };
    queryClient.setQueryData<TaskRecurrence[]>(taskKeys.recurrences, (old) => [...(old ?? []), series]);
    const link = (t: Task): Task =>
      t.id === taskId ? { ...t, recurrence_id: id, occurrence_date: input.start_date } : t;
    queryClient.setQueryData<Task[]>(taskKeys.open, (old) => old?.map(link));
    queryClient.setQueryData<Task>(taskKeys.detail(taskId), (old) => (old ? link(old) : old));
    return context;
  },
  onError: (_err, _vars, context) => restore(context),
  onSettled: settle,
};

const updateRecurrenceMutationOptions: UseMutationOptions<void, Error, UpdateRecurrenceVariables, Snapshot> = {
  mutationKey: [...RECURRENCE_MUTATION_KEY, 'update'],
  scope: TASKS_QUEUE_SCOPE,
  mutationFn: updateTaskRecurrence,
  onMutate: async ({ id, from, ...input }) => {
    const context = await snapshot();
    queryClient.setQueryData<TaskRecurrence[]>(taskKeys.recurrences, (old) =>
      old?.map((r) =>
        r.id === id
          ? {
              ...r,
              ...input,
              days_of_week: usesDaysOfWeek(input.frequency) ? input.days_of_week : null,
      month_day: input.frequency === 'monthly' ? input.month_day : null,
      month_week: input.frequency === 'monthly_weekday' ? input.month_week : null,
              skipped_dates: [],
            }
          : r,
      ),
    );
    // The server deletes these and the sync makes their replacements; until
    // then, showing the old pattern's occurrences would be showing a lie.
    queryClient.setQueryData<Task[]>(taskKeys.open, (old) =>
      old?.filter((t) => !(t.recurrence_id === id && t.occurrence_date && t.occurrence_date >= from)),
    );
    return context;
  },
  onError: (_err, _vars, context) => restore(context),
  onSettled: settle,
};

const stopRecurrenceMutationOptions: UseMutationOptions<void, Error, StopRecurrenceVariables, Snapshot> = {
  mutationKey: [...RECURRENCE_MUTATION_KEY, 'stop'],
  scope: TASKS_QUEUE_SCOPE,
  mutationFn: stopTaskRecurrence,
  onMutate: async ({ id, after }) => {
    const context = await snapshot();
    queryClient.setQueryData<TaskRecurrence[]>(taskKeys.recurrences, (old) =>
      old?.map((r) => (r.id === id ? { ...r, active: false } : r)),
    );
    queryClient.setQueryData<Task[]>(taskKeys.open, (old) =>
      old?.filter((t) => !(t.recurrence_id === id && t.occurrence_date && t.occurrence_date > after)),
    );
    return context;
  },
  onError: (_err, _vars, context) => restore(context),
  onSettled: settle,
};

export const taskRecurrenceMutationOptionsByKey = {
  create: createRecurrenceMutationOptions,
  update: updateRecurrenceMutationOptions,
  stop: stopRecurrenceMutationOptions,
};

export function useCreateTaskRecurrenceMutation() {
  return useMutation(createRecurrenceMutationOptions);
}
export function useUpdateTaskRecurrenceMutation() {
  return useMutation(updateRecurrenceMutationOptions);
}
export function useStopTaskRecurrenceMutation() {
  return useMutation(stopRecurrenceMutationOptions);
}

/** The rows that should exist for `series` inside today's window, as they'd be inserted. */
export function plannedOccurrences(series: TaskRecurrence[], userId: string, now: Date): OccurrenceRow[] {
  const today = toDayKey(now);
  const rows: OccurrenceRow[] = [];
  for (const s of series) {
    if (s.creator_id && s.creator_id !== userId) continue;
    const { hour, minute } = parseTime(s.due_time) ?? { hour: 9, minute: 0 };
    for (const day of occurrenceDates(s, today)) {
      const date = fromDayKey(day)!;
      const due = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, minute);
      rows.push({
        id: Crypto.randomUUID(),
        creator_id: userId,
        assignee_id: userId,
        origin: 'personal',
        title: s.title,
        notes: s.notes,
        due_at: due.toISOString(),
        alarm_enabled: s.alarm_enabled,
        // As if written at its due time: an occurrence whose day arrives sits
        // above tasks made before it, the way a freshly added task would.
        sort_order: -due.getTime() / 1000,
        recurrence_id: s.id,
        occurrence_date: day,
      });
    }
  }
  return rows;
}

/**
 * Keeps every active series' rolling window filled. Mounted once, in the
 * signed-in layout, for the same reason as the reminder hooks: the window
 * has to move forward as days pass whichever screen the app opens on.
 *
 * Runs when the series list changes, when the app comes forward (a new day
 * may have started), and when a connection comes back — never while a series
 * mutation is still queued, because a series the server hasn't created yet
 * can't have occurrences, and a converted task that isn't linked yet would
 * collide with its own first occurrence.
 *
 * Deliberately not keyed on the task list: materialising changes the task
 * list, and that would loop.
 */
export function useTaskRecurrenceSync() {
  const { user } = useSession();
  const { data: series } = useTaskRecurrencesQuery();
  const isOnline = useOnlineStatus();
  const pending = useIsMutating({ mutationKey: [...RECURRENCE_MUTATION_KEY] });

  useEffect(() => {
    if (!user || !series || !isOnline || pending > 0) return;
    const sync = () => {
      const rows = plannedOccurrences(series, user.id, new Date());
      materializeOccurrences(rows)
        .then(() => queryClient.invalidateQueries({ queryKey: taskKeys.open }))
        .catch(() => {});
    };
    sync();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') sync();
    });
    return () => subscription.remove();
  }, [user, series, isOnline, pending]);
}
