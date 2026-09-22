import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { toDayKey } from '@/lib/calendar/day';
import { diffReminders, planReminders, REMINDER_PREFIX, type RemindableMedication } from '@/lib/medications/reminder-plan';

/**
 * Local medicine reminders. Nothing here touches a server or a push token —
 * every notification is scheduled on the device, from the medications already
 * in the query cache. The web build swaps this file for `reminders.web.ts`.
 */

export const DOSE_CATEGORY = 'dose';
export const DOSE_ACTION_TAKEN = 'taken';
export const DOSE_ACTION_SNOOZE = 'snooze';
export const SNOOZE_MINUTES = 10;
const CHANNEL_ID = 'medication-reminders';
const SNOOZE_PREFIX = 'snooze:';

export type ReminderPermission = 'granted' | 'denied' | 'undetermined' | 'unsupported';

/**
 * What a reminder carries, so a tap or an action knows which slot it answers.
 * A repeating reminder can't know its day, so the day it was delivered is
 * used; a snooze pins `day`, so 23:55 snoozed past midnight still answers the
 * night before.
 */
export type DosePayload = { medicationId: string; time: string; day?: string };

export const remindersSupported = true;

let configured = false;

/** Handler, channel and action buttons. Idempotent; call before scheduling or listening. */
export async function configureReminders(): Promise<void> {
  if (configured) return;
  configured = true;

  // Shown even while the app is open: a dose reminder arriving on the Tasks
  // screen should still be seen.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Medicine reminders',
      description: 'A nudge at each time you set for a medicine.',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  // Both actions open the app. An action with opensAppToForeground: false is
  // silently dropped when the app has been killed, and a "Taken" that doesn't
  // get recorded is worse than a screen that opens for a second.
  await Notifications.setNotificationCategoryAsync(DOSE_CATEGORY, [
    { identifier: DOSE_ACTION_TAKEN, buttonTitle: 'Taken', options: { opensAppToForeground: true } },
    {
      identifier: DOSE_ACTION_SNOOZE,
      buttonTitle: `Snooze ${SNOOZE_MINUTES} min`,
      options: { opensAppToForeground: true },
    },
  ]);
}

export async function getReminderPermission(): Promise<ReminderPermission> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined';
}

/**
 * Asked in context — when someone saves a medicine with reminders on — never
 * at launch. The channel has to exist first on Android 13+, which is what
 * surfaces the system prompt.
 */
export async function requestReminderPermission(): Promise<ReminderPermission> {
  await configureReminders();
  const current = await getReminderPermission();
  if (current !== 'undetermined') return current;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted' ? 'granted' : 'denied';
}

/**
 * Makes the scheduled reminders match `meds`: a diff, so an unchanged list
 * schedules and cancels nothing. Returns how many reminders didn't fit under
 * the platform's pending limit.
 */
export async function syncReminders(meds: RemindableMedication[], now = new Date()): Promise<{ overflow: number }> {
  await configureReminders();
  if ((await getReminderPermission()) !== 'granted') return { overflow: 0 };

  const { requests, overflow } = planReminders(meds, toDayKey(now));
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const existing = scheduled.map((n) => ({
    identifier: n.identifier,
    signature: typeof n.content.data?.signature === 'string' ? n.content.data.signature : null,
  }));
  const { toSchedule, toCancel } = diffReminders(requests, existing);

  await Promise.all(toCancel.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
  for (const request of toSchedule) {
    const data: DosePayload & { signature: string } = {
      medicationId: request.medicationId,
      time: request.time,
      signature: request.signature,
    };
    await Notifications.scheduleNotificationAsync({
      identifier: request.identifier,
      content: { title: request.title, body: request.body, data, categoryIdentifier: DOSE_CATEGORY },
      trigger:
        request.weekday === null
          ? {
              type: Notifications.SchedulableTriggerInputTypes.DAILY,
              hour: request.hour,
              minute: request.minute,
              channelId: CHANNEL_ID,
            }
          : {
              type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
              weekday: request.weekday,
              hour: request.hour,
              minute: request.minute,
              channelId: CHANNEL_ID,
            },
    });
  }
  return { overflow };
}

/** One more nudge for the same slot, `SNOOZE_MINUTES` from now. */
export async function snoozeReminder(response: DoseResponse): Promise<void> {
  const { content, payload } = response;
  const data: DosePayload = { ...payload, day: doseDay(response) };
  await Notifications.scheduleNotificationAsync({
    identifier: `${SNOOZE_PREFIX}${Date.now()}`,
    content: {
      title: content.title ?? 'Medicine reminder',
      body: content.body ?? undefined,
      data,
      categoryIdentifier: DOSE_CATEGORY,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: SNOOZE_MINUTES * 60,
      channelId: CHANNEL_ID,
    },
  });
}

/** Signing out must not leave someone else's medicine names on this device's lock screen. */
export async function cancelAllReminders(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith(REMINDER_PREFIX) || n.identifier.startsWith(SNOOZE_PREFIX))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

export type DoseResponse = {
  action: 'open' | 'taken' | 'snooze';
  payload: DosePayload;
  content: Notifications.NotificationContent;
  /** When the reminder was delivered; the slot's day is read from it. */
  date: Date;
};

/** The local day of the slot a response answers. */
export function doseDay(response: DoseResponse): string {
  return response.payload.day ?? toDayKey(response.date);
}

function toDoseResponse(response: Notifications.NotificationResponse): DoseResponse | null {
  const { content } = response.notification.request;
  const data = content.data as Partial<DosePayload> | undefined;
  if (typeof data?.medicationId !== 'string' || typeof data.time !== 'string') return null;
  const action =
    response.actionIdentifier === DOSE_ACTION_TAKEN
      ? 'taken'
      : response.actionIdentifier === DOSE_ACTION_SNOOZE
        ? 'snooze'
        : 'open';
  return {
    action,
    payload: { medicationId: data.medicationId, time: data.time, day: typeof data.day === 'string' ? data.day : undefined },
    content,
    date: new Date(response.notification.date),
  };
}

/**
 * Calls `handler` for every dose-reminder response: the one that cold-started
 * the app (if any) and each one after. Returns an unsubscribe function.
 */
export function listenForDoseResponses(handler: (response: DoseResponse) => void): () => void {
  let active = true;
  const seen = new Set<string>();
  const handle = (response: Notifications.NotificationResponse | null) => {
    if (!active || !response) return;
    // The launch response and the listener can both report the same tap.
    const key = `${response.notification.request.identifier}|${response.notification.date}|${response.actionIdentifier}`;
    if (seen.has(key)) return;
    seen.add(key);
    const dose = toDoseResponse(response);
    if (dose) handler(dose);
    Notifications.clearLastNotificationResponseAsync().catch(() => {});
  };

  Notifications.getLastNotificationResponseAsync().then(handle, () => {});
  const subscription = Notifications.addNotificationResponseReceivedListener(handle);
  return () => {
    active = false;
    subscription.remove();
  };
}
