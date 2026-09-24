import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { cancelTaskFollowUps } from '@/lib/alarms/alarm-notifications';
import {
  ACTION_SNOOZE,
  ACTION_STOP,
  alarmChannel,
  alarmContent,
  TASK_CATEGORY,
  TASK_CHANNEL_ID,
} from '@/lib/alarms/alarm-style';
import { SNOOZE_MINUTES, taskAlarmKey } from '@/lib/alarms/ringing';
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

export { TASK_CATEGORY };
export const TASK_ACTION_STOP = ACTION_STOP;
export const TASK_ACTION_SNOOZE = ACTION_SNOOZE;

export type TaskAlarmPayload = { taskId: string; alarmKey?: string };
export type TaskAlarmResponse = { taskId: string; alarmKey: string | null; action: 'open' | 'stop' | 'snooze' };

let configured = false;

/** Channel and action buttons. Idempotent; call before scheduling or listening. */
export async function configureTaskReminders(): Promise<void> {
  if (configured) return;
  configured = true;
  await configureReminders();

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(
      TASK_CHANNEL_ID,
      alarmChannel('Task alarms', "Rings at a task's due time, until you stop it, for tasks with an alarm turned on."),
    );
  }

  // Both open the app, for the same reason as the medicine buttons in
  // reminders.ts: a background action is dropped when the app was killed.
  // Tapping the notification itself opens the task.
  await Notifications.setNotificationCategoryAsync(TASK_CATEGORY, [
    { identifier: TASK_ACTION_STOP, buttonTitle: 'Stop alarm', options: { opensAppToForeground: true } },
    {
      identifier: TASK_ACTION_SNOOZE,
      buttonTitle: `Snooze ${SNOOZE_MINUTES} min`,
      options: { opensAppToForeground: true },
    },
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

  const planned = planTaskReminders(tasks, currentUserId, now);
  // The channel is part of the signature so a channel change (the move to
  // alarm-sound channels) reschedules everything already pending.
  const requests = planned.requests.map((r) => ({ ...r, signature: `${r.signature}|${TASK_CHANNEL_ID}` }));
  const { overflow } = planned;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const existing = scheduled.map((n) => ({
    identifier: n.identifier,
    signature: typeof n.content.data?.signature === 'string' ? n.content.data.signature : null,
  }));
  const { toSchedule, toCancel } = diffTaskReminders(requests, existing);

  await Promise.all(toCancel.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
  for (const request of toSchedule) {
    const data: TaskAlarmPayload & { signature: string } = {
      taskId: request.taskId,
      alarmKey: taskAlarmKey(request.taskId, request.date.toISOString()),
      signature: request.signature,
    };
    await Notifications.scheduleNotificationAsync({
      identifier: request.identifier,
      content: { ...alarmContent, title: request.title, body: request.body, data, categoryIdentifier: TASK_CATEGORY },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: request.date, channelId: TASK_CHANNEL_ID },
    });
  }
  return { overflow };
}

/**
 * Cancels a single task's alarm immediately — completing, cancelling,
 * deleting a task, or turning its alarm off shouldn't wait for the next full
 * resync to stop a notification that's no longer wanted, or one that's
 * already ringing. The first ring's identifier is deterministic; follow-ups
 * share a prefix.
 */
export async function cancelTaskReminder(taskId: string): Promise<void> {
  await Promise.all([
    Notifications.cancelScheduledNotificationAsync(`${TASK_REMINDER_PREFIX}${taskId}`).catch(() => {}),
    cancelTaskFollowUps(taskId).catch(() => {}),
  ]);
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

function toTaskAlarmResponse(response: Notifications.NotificationResponse): TaskAlarmResponse | null {
  const data = response.notification.request.content.data as Partial<TaskAlarmPayload> | undefined;
  if (typeof data?.taskId !== 'string') return null;
  const action =
    response.actionIdentifier === TASK_ACTION_STOP
      ? 'stop'
      : response.actionIdentifier === TASK_ACTION_SNOOZE
        ? 'snooze'
        : 'open';
  return { taskId: data.taskId, alarmKey: typeof data.alarmKey === 'string' ? data.alarmKey : null, action };
}

/**
 * Calls `handler` for every task-alarm response (a tap, Stop or Snooze): the one
 * that cold-started the app (if any) and each one after. A response for a
 * medicine reminder simply carries no `taskId` and is ignored here — the two
 * listeners (this one and `listenForDoseResponses`) coexist safely, each
 * only acting on the payload shape it recognises. Returns an unsubscribe
 * function.
 */
export function listenForTaskReminderResponses(handler: (response: TaskAlarmResponse) => void): () => void {
  let active = true;
  const seen = new Set<string>();
  const handle = (response: Notifications.NotificationResponse | null) => {
    if (!active || !response) return;
    const key = `${response.notification.request.identifier}|${response.notification.date}|${response.actionIdentifier}`;
    if (seen.has(key)) return;
    seen.add(key);
    const alarm = toTaskAlarmResponse(response);
    if (alarm) {
      handler(alarm);
      // Otherwise a remount would replay it — and snooze again.
      Notifications.clearLastNotificationResponseAsync().catch(() => {});
    }
  };

  Notifications.getLastNotificationResponseAsync().then(handle, () => {});
  const subscription = Notifications.addNotificationResponseReceivedListener(handle);
  return () => {
    active = false;
    subscription.remove();
  };
}
