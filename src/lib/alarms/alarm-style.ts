import * as Notifications from 'expo-notifications';

/**
 * How an alarm notification looks, sounds and behaves — shared by task alarms
 * (`task-reminders.ts`), medicine reminders (`reminders.ts`) and their
 * follow-ups (`alarm-notifications.ts`), so all three ring the same way.
 *
 * Its own module, importing nothing of ours, so those three can share it
 * without importing each other.
 */

/** Bundled by the expo-notifications config plugin (`sounds` in app.json); see scripts/generate-alarm-sound.mjs. */
export const ALARM_SOUND = 'alarm.wav';

/**
 * Android fixes a channel's sound and importance when it's first created, and
 * nothing an app does afterwards can change them — so ringing loudly needs
 * new channel ids, and the quiet originals are deleted (`LEGACY_CHANNEL_IDS`).
 * Scheduled notifications carry their channel id in their signature, so the
 * next sync moves every pending one across.
 */
export const TASK_CHANNEL_ID = 'task-alarms-v2';
export const DOSE_CHANNEL_ID = 'medication-reminders-v2';
export const LEGACY_CHANNEL_IDS = ['task-alarms', 'medication-reminders'];

export const TASK_CATEGORY = 'task-alarm';
export const DOSE_CATEGORY = 'dose';

export const ACTION_STOP = 'stop';
export const ACTION_SNOOZE = 'snooze';
export const DOSE_ACTION_TAKEN = 'taken';

export const ALARM_VIBRATION = [0, 800, 400, 800, 400, 800];

/**
 * Alarm-volume audio (not notification volume, which people often keep low
 * or muted), vibration, and Do Not Disturb bypass where the person has
 * allowed it for Goodlist.
 */
export function alarmChannel(name: string, description: string): Notifications.NotificationChannelInput {
  return {
    name,
    description,
    importance: Notifications.AndroidImportance.MAX,
    sound: ALARM_SOUND,
    audioAttributes: {
      usage: Notifications.AndroidAudioUsage.ALARM,
      contentType: Notifications.AndroidAudioContentType.SONIFICATION,
    },
    enableVibrate: true,
    vibrationPattern: ALARM_VIBRATION,
    bypassDnd: true,
  };
}

/**
 * Content every alarm notification carries.
 * - `sticky`: Android can't swipe it away unread; Stop, Snooze, Taken or
 *   finishing the task clears it.
 * - `interruptionLevel: 'timeSensitive'`: iOS delivers it through Focus modes
 *   (needs the time-sensitive entitlement in app.json).
 * - `sound`: iOS names the file here; Android takes it from the channel.
 */
export const alarmContent = {
  sound: ALARM_SOUND,
  priority: Notifications.AndroidNotificationPriority.MAX,
  vibrate: ALARM_VIBRATION,
  sticky: true,
  interruptionLevel: 'timeSensitive',
} satisfies Partial<Notifications.NotificationContentInput>;

/** Deletes the pre-alarm-sound channels, so Settings doesn't list two of each. */
export async function deleteLegacyChannels(): Promise<void> {
  await Promise.all(LEGACY_CHANNEL_IDS.map((id) => Notifications.deleteNotificationChannelAsync(id).catch(() => {})));
}
