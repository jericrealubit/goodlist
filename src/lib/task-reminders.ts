import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { configureReminders, getReminderPermission } from '@/lib/reminders';
import {
  diffTaskReminders,
  planTaskReminders,
  TASK_REMINDER_PREFIX,
  type RemindableTask,
} from '@/lib/tasks/reminder-plan';

/**
 * Local one-shot task alarms. Nothing here touches a server or a push token —
 * every notification is scheduled on the device, from the tasks already in
 * the query cache. The web build swaps this file for `task-reminders.web.ts`.
 *
 * Permission and the base notification handler are shared with medicine
 * reminders (`@/lib/reminders`'s `configureReminders`/`getReminderPermission`/
 * `requestReminderPermission`) rather than duplicated — one app, one
 * notification permission. This module only adds its own Android channel and
 * category on top.
 */

export const TASK_CATEGORY = 'task-alarm';
export const TASK_ACTION_OPEN = 'open';
const CHANNEL_ID = 'task-alarms';

export type TaskAlarmPayload = { taskId: string };

let configured = false;

/** Channel and action button. Idempotent; call before scheduling or listening. */
export async function configureTaskReminders(): Promise<void> {
  if (configured) return;
  configured = true;
  await configureReminders();

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Task alarms',
      description: "An alert at a task's due time, for tasks with an alarm turned on.",
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  await Notifications.setNotificationCategoryAsync(TASK_CATEGORY, [
    { identifier: TASK_ACTION_OPEN, buttonTitle: 'Open', options: { opensAppToForeground: true } },
  ]);
}

/**
 * Makes the scheduled alarms match `tasks`: a diff, so an unchanged list
 * schedules and cancels nothing. `currentUserId` scopes this to alarms for
 * tasks assigned to this device's signed-in user — a requester shouldn't be
 * buzzed for a task they handed off to someone else. Returns how many
 * alarmed tasks didn't fit under this module's cap.
 */
export async function syncTaskReminders(
  tasks: RemindableTask[],
  currentUserId: string,
  now = new Date(),
): Promise<{ overflow: number }> {
  await configureTaskReminders();
  if ((await getReminderPermission()) !== 'granted') return { overflow: 0 };

  const { requests, overflow } = planTaskReminders(tasks, currentUserId, now);
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const existing = scheduled.map((n) => ({
    identifier: n.identifier,
    signature: typeof n.content.data?.signature === 'string' ? n.content.data.signature : null,
  }));
  const { toSchedule, toCancel } = diffTaskReminders(requests, existing);

  await Promise.all(toCancel.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
  for (const request of toSchedule) {
    const data: TaskAlarmPayload & { signature: string } = { taskId: request.taskId, signature: request.signature };
    await Notifications.scheduleNotificationAsync({
      identifier: request.identifier,
      content: { title: request.title, body: request.body, data, categoryIdentifier: TASK_CATEGORY },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: request.date, channelId: CHANNEL_ID },
    });
  }
  return { overflow };
}

/**
 * Cancels a single task's alarm immediately — completing, cancelling,
 * deleting a task, or turning its alarm off shouldn't wait for the next full
 * resync to stop a notification that's no longer wanted. The identifier is
 * deterministic, so no need to enumerate what's scheduled first.
 */
export async function cancelTaskReminder(taskId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(`${TASK_REMINDER_PREFIX}${taskId}`).catch(() => {});
}

/** Signing out must not leave someone else's tasks alarming on this device. */
export async function cancelAllTaskReminders(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith(TASK_REMINDER_PREFIX))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

function toTaskId(response: Notifications.NotificationResponse): string | null {
  const data = response.notification.request.content.data as Partial<TaskAlarmPayload> | undefined;
  return typeof data?.taskId === 'string' ? data.taskId : null;
}

/**
 * Calls `handler` with the task id for every task-alarm response: the one
 * that cold-started the app (if any) and each one after. A response for a
 * medicine reminder simply carries no `taskId` and is ignored here — the two
 * listeners (this one and `listenForDoseResponses`) coexist safely, each
 * only acting on the payload shape it recognises. Returns an unsubscribe
 * function.
 */
export function listenForTaskReminderResponses(handler: (taskId: string) => void): () => void {
  let active = true;
  const seen = new Set<string>();
  const handle = (response: Notifications.NotificationResponse | null) => {
    if (!active || !response) return;
    const key = `${response.notification.request.identifier}|${response.notification.date}|${response.actionIdentifier}`;
    if (seen.has(key)) return;
    seen.add(key);
    const taskId = toTaskId(response);
    if (taskId) handler(taskId);
  };

  Notifications.getLastNotificationResponseAsync().then(handle, () => {});
  const subscription = Notifications.addNotificationResponseReceivedListener(handle);
  return () => {
    active = false;
    subscription.remove();
  };
}
