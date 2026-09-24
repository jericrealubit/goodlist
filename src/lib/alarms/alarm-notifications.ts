import * as Notifications from 'expo-notifications';

import { alarmContent, DOSE_CATEGORY, DOSE_CHANNEL_ID, TASK_CATEGORY, TASK_CHANNEL_ID } from '@/lib/alarms/alarm-style';
import {
  diffFollowUps,
  doseAlarmKey,
  FOLLOW_UP_PREFIX,
  isRinging,
  planFollowUps,
  taskFollowUpPrefix,
  type Alarm,
  type AlarmMarks,
} from '@/lib/alarms/ringing';
import { toDayKey } from '@/lib/calendar/day';

/**
 * The follow-up notifications that keep an unanswered alarm ringing while the
 * app is closed, and clearing an alarm's notifications once it's answered.
 * The web build swaps this file for `alarm-notifications.web.ts`.
 *
 * Follow-ups carry the same payload shape as the alarm they follow (a task's
 * `taskId`, a dose's `medicationId`/`time`/`day`) and the same category, so
 * the existing response listeners — and their Taken / Snooze / Stop buttons —
 * treat a follow-up exactly like the first ring.
 */

/**
 * Which alarm a delivered notification belongs to. Follow-ups and task alarms
 * carry `alarmKey`; a medicine's first ring comes from a repeating trigger
 * that can't know its day, so its key is rebuilt from when it was delivered —
 * the same rule `doseDay` in reminders.ts uses.
 */
export function alarmKeyOf(notification: Notifications.Notification): string | null {
  const data = notification.request.content.data as Record<string, unknown> | undefined;
  if (typeof data?.alarmKey === 'string') return data.alarmKey;
  if (typeof data?.medicationId === 'string' && typeof data.time === 'string') {
    const day = typeof data.day === 'string' ? data.day : toDayKey(new Date(notification.date));
    return doseAlarmKey(data.medicationId, day, data.time);
  }
  return null;
}

async function dismissPresented(shouldDismiss: (key: string) => boolean): Promise<void> {
  const presented = await Notifications.getPresentedNotificationsAsync();
  await Promise.all(
    presented
      .filter((n) => {
        const key = alarmKeyOf(n);
        return key !== null && shouldDismiss(key);
      })
      .map((n) => Notifications.dismissNotificationAsync(n.request.identifier).catch(() => {})),
  );
}

async function cancelScheduled(shouldCancel: (identifier: string) => boolean): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => shouldCancel(n.identifier))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier).catch(() => {})),
  );
}

/**
 * Makes pending follow-ups match what's unanswered, and clears from the tray
 * any alarm that's no longer ringing (answered in the app, on another device,
 * or snoozed). A diff, so an unchanged state schedules and cancels nothing.
 * Channels and categories must already be configured — the caller runs
 * `configureTaskReminders()` first.
 */
export async function syncAlarmFollowUps(alarms: Alarm[], marks: AlarmMarks, now = new Date()): Promise<void> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return;

  const requests = planFollowUps(alarms, marks, now);
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const existing = scheduled.map((n) => ({
    identifier: n.identifier,
    signature: typeof n.content.data?.signature === 'string' ? n.content.data.signature : null,
  }));
  const { toSchedule, toCancel } = diffFollowUps(requests, existing);

  await Promise.all(toCancel.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
  for (const request of toSchedule) {
    const { source } = request;
    const data =
      source.kind === 'task'
        ? { alarmKey: request.alarmKey, signature: request.signature, taskId: source.taskId }
        : {
            alarmKey: request.alarmKey,
            signature: request.signature,
            medicationId: source.medicationId,
            time: source.time,
            day: source.day,
          };
    await Notifications.scheduleNotificationAsync({
      identifier: request.identifier,
      content: {
        ...alarmContent,
        title: request.title,
        body: request.body,
        data,
        categoryIdentifier: source.kind === 'task' ? TASK_CATEGORY : DOSE_CATEGORY,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: request.date,
        channelId: source.kind === 'task' ? TASK_CHANNEL_ID : DOSE_CHANNEL_ID,
      },
    });
  }

  // Whatever is still ringing, or hasn't started yet, stays in the tray.
  const live = new Set(alarms.filter((a) => isRinging(a, marks[a.key], now) || a.at > now).map((a) => a.key));
  await dismissPresented((key) => !live.has(key));
}

/** Takes these alarms' notifications out of the tray; what's pending is left to the next sync. */
export async function dismissAlarms(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  const dismissed = new Set(keys);
  await dismissPresented((key) => dismissed.has(key));
}

/** Stop, Taken, Done: silence these alarms now rather than on the next sync. */
export async function silenceAlarms(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  const silenced = new Set(keys);
  await Promise.all([
    cancelScheduled((id) => keys.some((key) => id.startsWith(`${FOLLOW_UP_PREFIX}${key}#`))),
    dismissPresented((key) => silenced.has(key)),
  ]);
}

/** A task completed, cancelled, deleted or with its alarm turned off rings no more. */
export async function cancelTaskFollowUps(taskId: string): Promise<void> {
  const prefix = taskFollowUpPrefix(taskId);
  await Promise.all([
    cancelScheduled((id) => id.startsWith(prefix)),
    dismissPresented((key) => key.startsWith(`task:${taskId}@`)),
  ]);
}

/**
 * Signing out must not leave the last person's alarms ringing on this device —
 * nor stuck in the tray, since alarm notifications can't be swiped away.
 */
export async function cancelAllAlarmFollowUps(): Promise<void> {
  await Promise.all([cancelScheduled((id) => id.startsWith(FOLLOW_UP_PREFIX)), dismissPresented(() => true)]);
}

/**
 * Calls `handler` with the alarm key of every alarm notification delivered
 * while the app is open, so the alarm screen can take over from the banner.
 */
export function listenForAlarmsReceived(handler: (alarmKey: string) => void): () => void {
  const subscription = Notifications.addNotificationReceivedListener((notification) => {
    const key = alarmKeyOf(notification);
    if (key) handler(key);
  });
  return () => subscription.remove();
}
