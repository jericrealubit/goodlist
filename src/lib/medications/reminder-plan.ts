/**
 * Which local notifications *should* exist, and how to get from the ones that
 * do exist to those.
 *
 * Reminders are repeating triggers (daily, or weekly per weekday) rather than a
 * rolling window of one-shots, so they keep firing even if the app isn't opened
 * for a month. The cost is that a repeating trigger can't know a dose was
 * already logged early; for a medicine, an unnecessary nudge is the right side
 * to err on.
 *
 * Identifiers are deterministic, and each request carries a signature of its
 * content, so reconciling is a pure diff: nothing is cancelled and re-created
 * unless it actually changed, and a rename reschedules exactly what it touched.
 */
import type { DayKey } from '../calendar/day.ts';
import { normalizeTimes, parseTime, type Schedulable } from './schedule.ts';

export type RemindableMedication = Schedulable & {
  name: string;
  dose: string | null;
  reminders_enabled: boolean;
};

export type ReminderRequest = {
  identifier: string;
  medicationId: string;
  time: string;
  hour: number;
  minute: number;
  /** Expo's WEEKLY weekday: 1 = Sunday … 7 = Saturday. Null means a DAILY trigger. */
  weekday: number | null;
  title: string;
  body: string;
  /** Changes whenever anything that is shown or scheduled changes. */
  signature: string;
};

export type ScheduledReminder = { identifier: string; signature: string | null };

/** Every reminder this module owns starts with this; snoozes and anything else are left alone. */
export const REMINDER_PREFIX = 'med:';

/**
 * iOS keeps at most 64 pending local notifications and silently drops the rest.
 * Four are held back for snoozes.
 */
export const REMINDER_LIMIT = 60;

export function reminderIdentifier(medicationId: string, weekday: number | null, time: string): string {
  return `${REMINDER_PREFIX}${medicationId}:${weekday ?? '*'}:${time}`;
}

export function isActiveOn(med: RemindableMedication, today: DayKey): boolean {
  if (!med.reminders_enabled || med.archived_at) return false;
  // A repeating trigger can't start in the future, so a course that hasn't
  // begun gets none yet; the foreground re-sync adds them on its first day.
  if (med.start_date > today) return false;
  return !med.end_date || med.end_date >= today;
}

export function planReminders(
  meds: RemindableMedication[],
  today: DayKey,
): { requests: ReminderRequest[]; overflow: number } {
  const daily: ReminderRequest[] = [];
  const weekly: ReminderRequest[] = [];

  for (const med of meds) {
    if (!isActiveOn(med, today)) continue;
    const title = `Time for ${med.name}`;
    const body = med.dose ? `${med.dose} — tap Taken once you have.` : 'Tap Taken once you have.';

    for (const time of normalizeTimes(med.times)) {
      const { hour, minute } = parseTime(time)!;
      const weekdays = med.days_of_week ? [...new Set(med.days_of_week)].sort() : [null];
      for (const day of weekdays) {
        const weekday = day === null ? null : day + 1;
        const request: ReminderRequest = {
          identifier: reminderIdentifier(med.id, weekday, time),
          medicationId: med.id,
          time,
          hour,
          minute,
          weekday,
          title,
          body,
          signature: [title, body, hour, minute, weekday ?? '*'].join('|'),
        };
        (weekday === null ? daily : weekly).push(request);
      }
    }
  }

  // Over the cap, keep daily reminders first: one daily trigger covers seven
  // weekly ones' worth of doses.
  const all = [...daily, ...weekly];
  return { requests: all.slice(0, REMINDER_LIMIT), overflow: Math.max(0, all.length - REMINDER_LIMIT) };
}

export function diffReminders(
  desired: ReminderRequest[],
  existing: ScheduledReminder[],
): { toSchedule: ReminderRequest[]; toCancel: string[] } {
  const ours = existing.filter((e) => e.identifier.startsWith(REMINDER_PREFIX));
  const existingById = new Map(ours.map((e) => [e.identifier, e.signature]));
  const desiredById = new Map(desired.map((d) => [d.identifier, d]));

  const toCancel = ours
    .filter((e) => desiredById.get(e.identifier)?.signature !== e.signature)
    .map((e) => e.identifier);
  const toSchedule = desired.filter((d) => existingById.get(d.identifier) !== d.signature);
  return { toSchedule, toCancel };
}
