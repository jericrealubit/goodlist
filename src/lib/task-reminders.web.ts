import type { RemindableTask } from '@/lib/tasks/reminder-plan';

/**
 * expo-notifications can't schedule local notifications in a browser, so on
 * web task alarms simply don't exist — same story as medicine reminders'
 * `reminders.web.ts`, which this mirrors.
 */

export const TASK_CATEGORY = 'task-alarm';
export const TASK_ACTION_OPEN = 'open';

export type TaskAlarmPayload = { taskId: string };

export async function configureTaskReminders(): Promise<void> {}

export async function syncTaskReminders(
  _tasks: RemindableTask[],
  _currentUserId: string,
  _now?: Date,
): Promise<{ overflow: number }> {
  return { overflow: 0 };
}

export async function cancelTaskReminder(_taskId: string): Promise<void> {}

export async function cancelAllTaskReminders(): Promise<void> {}

export function listenForTaskReminderResponses(_handler: (taskId: string) => void): () => void {
  return () => {};
}
