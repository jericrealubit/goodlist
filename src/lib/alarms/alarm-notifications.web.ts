import type { Alarm, AlarmMarks } from '@/lib/alarms/ringing';

/**
 * expo-notifications can't schedule local notifications in a browser, so on
 * web there's nothing to follow up — same as `task-reminders.web.ts`.
 */

export function alarmKeyOf(_notification: unknown): string | null {
  return null;
}

export async function syncAlarmFollowUps(_alarms: Alarm[], _marks: AlarmMarks, _now?: Date): Promise<void> {}

export async function dismissAlarms(_keys: string[]): Promise<void> {}

export async function silenceAlarms(_keys: string[]): Promise<void> {}

export async function cancelTaskFollowUps(_taskId: string): Promise<void> {}

export async function cancelAllAlarmFollowUps(): Promise<void> {}

export function listenForAlarmsReceived(_handler: (alarmKey: string) => void): () => void {
  return () => {};
}
