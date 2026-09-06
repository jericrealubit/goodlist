import { useQuery } from '@tanstack/react-query';

import { taskKeys } from '@/lib/query-client';
import { getTask, listHistory, listOpenTasks } from '@/lib/queries/tasks';

export function useOpenTasksQuery() {
  return useQuery({ queryKey: taskKeys.open, queryFn: listOpenTasks });
}

export function useHistoryQuery() {
  return useQuery({ queryKey: taskKeys.history, queryFn: listHistory });
}

export function useTaskDetailQuery(id: string) {
  return useQuery({ queryKey: taskKeys.detail(id), queryFn: () => getTask(id), enabled: !!id });
}
