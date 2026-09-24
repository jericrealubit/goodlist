import type { RemindableMedication } from '@/lib/medications/reminder-plan';

/**
 * expo-notifications can't schedule local notifications in a browser, so on
 * web reminders simply don't exist. Tracking works the same everywhere; only
 * the nudge is missing, and the Meds tab says so rather than pretending.
 */

export type ReminderPermission = 'granted' | 'denied' | 'undetermined' | 'unsupported';
export type DosePayload = { medicationId: string; time: string; day?: string };
export type DoseResponse = {
  action: 'open' | 'taken' | 'snooze' | 'stop';
  payload: DosePayload;
  content: unknown;
  date: Date;
};

export const remindersSupported = false;

export async function configureReminders(): Promise<void> {}

export async function getReminderPermission(): Promise<ReminderPermission> {
  return 'unsupported';
}

export async function requestReminderPermission(): Promise<ReminderPermission> {
  return 'unsupported';
}

export async function syncReminders(_meds: RemindableMedication[], _now?: Date): Promise<{ overflow: number }> {
  return { overflow: 0 };
}

export async function cancelAllReminders(): Promise<void> {}

export function doseDay(response: DoseResponse): string {
  return response.payload.day ?? '';
}

export function listenForDoseResponses(_handler: (response: DoseResponse) => void): () => void {
  return () => {};
}
