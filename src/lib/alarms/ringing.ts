/**
 * Which alarms are ringing right now, and which follow-up notifications keep
 * them ringing until someone stops them.
 *
 * An alarm is one moment something needs doing: a task's due_at (alarm on,
 * assigned to this person, still open) or one dose slot of a medicine with
 * reminders on that hasn't been logged. It starts ringing at that moment and
 * keeps ringing until it's *answered*: stopped, snoozed, or the task done or
 * dose logged. Missing a medicine is the failure this exists to prevent, so a
 * single notification that can be swiped away unread isn't enough.
 *
 * What "keeps ringing" means depends on where the app is:
 * - Open: the alarm screen loops a sound and vibration until answered
 *   (`isRinging` decides what it shows, for up to `RINGING_WINDOW_MS`).
 * - Closed: the app can't run, so the ringing is pre-scheduled as one-shot
 *   follow-up notifications at `FOLLOW_UP_OFFSETS_MIN` after the alarm, and
 *   cancelled once it's answered (`planFollowUps`).
 *
 * Pure, structurally typed, relative `.ts` imports: `node --test` runs it
 * directly, like the other planners.
 */
import { addDays, fromDayKey, toDayKey, type DayKey } from '../calendar/day.ts';
import { slotsForDay, type Schedulable } from '../medications/schedule.ts';

export type AlarmSource =
  | { kind: 'task'; taskId: string }
  | { kind: 'dose'; medicationId: string; day: DayKey; time: string };

export type Alarm = {
  /** Stable for one occurrence: a task's due instant, or one dose slot. */
  key: string;
  at: Date;
  title: string;
  body: string;
  source: AlarmSource;
};

/** How someone answered an alarm without finishing the thing itself. */
export type AlarmMark = { stopped?: true; snoozedUntil?: string; updatedAt: string };
export type AlarmMarks = Record<string, AlarmMark>;

export type FollowUpRequest = {
  identifier: string;
  alarmKey: string;
  date: Date;
  title: string;
  body: string;
  source: AlarmSource;
  /** Changes whenever anything that is shown or scheduled changes. */
  signature: string;
};

export type ScheduledFollowUp = { identifier: string; signature: string | null };

/** Every follow-up this module owns starts with this. */
export const FOLLOW_UP_PREFIX = 'alarm:';

/**
 * Minutes after an alarm (or after a snooze ends) that it rings again while
 * unanswered: every minute at first, when it's most likely to be caught,
 * easing off to every quarter hour, for two hours.
 */
export const FOLLOW_UP_OFFSETS_MIN = [1, 2, 3, 4, 5, 10, 15, 20, 25, 30, 45, 60, 75, 90, 105, 120];

/**
 * How many follow-ups are pending at once, across all alarms. iOS keeps only
 * the 64 soonest pending notifications; follow-ups are near-term by nature,
 * so the soonest ones survive that cut, and the rest are topped up on the
 * next sync as earlier ones fire.
 */
export const FOLLOW_UP_LIMIT = 24;

/**
 * How long the open app keeps ringing an unanswered alarm. Long enough that
 * opening the phone hours later still demands an answer; short enough that
 * yesterday's alarm doesn't greet someone tomorrow.
 */
export const RINGING_WINDOW_MS = 12 * 60 * 60 * 1000;

export const SNOOZE_MINUTES = 10;

export function taskAlarmKey(taskId: string, dueAt: string): string {
  // Normalised through Date: the server and the optimistic cache spell the
  // same instant differently ("+00:00" vs "Z").
  return `task:${taskId}@${new Date(dueAt).getTime()}`;
}

export function doseAlarmKey(medicationId: string, day: DayKey, time: string): string {
  return `dose:${medicationId}@${day}T${time}`;
}

export function followUpIdentifier(alarmKey: string, index: number): string {
  return `${FOLLOW_UP_PREFIX}${alarmKey}#${index}`;
}

/** Prefix of every follow-up for one task, whatever its due time was. */
export function taskFollowUpPrefix(taskId: string): string {
  return `${FOLLOW_UP_PREFIX}task:${taskId}@`;
}

export type AlarmableTask = {
  id: string;
  title: string;
  notes: string | null;
  due_at: string | null;
  alarm_enabled: boolean;
  status: 'open' | 'completed' | 'cancelled';
  assignee_id: string;
  updated_at: string;
};

/**
 * Same rules as the one-shot alarm (`isAlarmable` in reminder-plan.ts) minus
 * "still in the future": a task that's already due is exactly the one that
 * should still be ringing. One exception — a task saved *after* its due time
 * never rang, so there's nothing to keep ringing; adding "take out the bins,
 * due 9am" at noon shouldn't set off an alarm the moment it's saved.
 */
export function taskAlarms(tasks: AlarmableTask[], currentUserId: string): Alarm[] {
  const alarms: Alarm[] = [];
  for (const task of tasks) {
    if (!task.alarm_enabled || task.status !== 'open' || !task.due_at) continue;
    if (task.assignee_id !== currentUserId) continue;
    const at = new Date(task.due_at);
    if (Number.isNaN(at.getTime()) || new Date(task.updated_at) > at) continue;
    alarms.push({
      key: taskAlarmKey(task.id, task.due_at),
      at,
      title: task.title,
      body: task.notes || 'Due now.',
      source: { kind: 'task', taskId: task.id },
    });
  }
  return alarms;
}

export type AlarmableMedication = Schedulable & {
  name: string;
  dose: string | null;
  reminders_enabled: boolean;
  updated_at: string;
};

export type LoggedDose = { medication_id: string; slot_date: string; slot_time: string };

/**
 * One alarm per unlogged dose slot on `days`. Logging a dose — taken or
 * skipped — answers it. Like tasks, a slot that had already passed when the
 * medicine was last saved never rang and doesn't start now.
 */
export function doseAlarms(meds: AlarmableMedication[], logged: LoggedDose[], days: DayKey[]): Alarm[] {
  const done = new Set(logged.map((d) => doseAlarmKey(d.medication_id, d.slot_date, d.slot_time)));
  const alarms: Alarm[] = [];
  for (const med of meds) {
    if (!med.reminders_enabled) continue;
    const savedAt = new Date(med.updated_at);
    for (const day of days) {
      for (const slot of slotsForDay(med, day)) {
        const key = doseAlarmKey(med.id, slot.day, slot.time);
        if (done.has(key) || savedAt > slot.at) continue;
        alarms.push({
          key,
          at: slot.at,
          title: `Time for ${med.name}`,
          body: med.dose ? `${med.dose} — tap Taken once you have.` : 'Tap Taken once you have.',
          source: { kind: 'dose', medicationId: med.id, day: slot.day, time: slot.time },
        });
      }
    }
  }
  return alarms;
}

/** Yesterday, today and tomorrow: enough to cover a late-night dose still ringing after midnight. */
export function doseAlarmDays(today: DayKey): DayKey[] {
  const date = fromDayKey(today);
  if (!date) return [];
  return [-1, 0, 1].map((offset) => toDayKey(addDays(date, offset)));
}

/** When the alarm (re)starts ringing: its own time, or when its snooze ends. */
export function ringsFrom(alarm: Alarm, mark: AlarmMark | undefined): Date {
  return mark?.snoozedUntil ? new Date(mark.snoozedUntil) : alarm.at;
}

export function isRinging(alarm: Alarm, mark: AlarmMark | undefined, now: Date): boolean {
  if (mark?.stopped) return false;
  const from = ringsFrom(alarm, mark).getTime();
  return from <= now.getTime() && now.getTime() - from < RINGING_WINDOW_MS;
}

/** Everything ringing now, earliest first. */
export function ringingAlarms(alarms: Alarm[], marks: AlarmMarks, now: Date): Alarm[] {
  return alarms
    .filter((a) => isRinging(a, marks[a.key], now))
    .sort((a, b) => a.at.getTime() - b.at.getTime() || a.key.localeCompare(b.key));
}

/**
 * The follow-up notifications that should be pending. A snoozed alarm rings
 * once when the snooze ends (that ring *is* the snooze) and then follows up
 * from there; an unsnoozed one's first ring is its own notification, so its
 * follow-ups start a minute later. Over the cap, the soonest win.
 */
export function planFollowUps(alarms: Alarm[], marks: AlarmMarks, now: Date): FollowUpRequest[] {
  const requests: FollowUpRequest[] = [];
  for (const alarm of alarms) {
    const mark = marks[alarm.key];
    if (mark?.stopped) continue;
    const base = ringsFrom(alarm, mark).getTime();
    const offsets = mark?.snoozedUntil ? [0, ...FOLLOW_UP_OFFSETS_MIN] : FOLLOW_UP_OFFSETS_MIN;
    offsets.forEach((minutes, index) => {
      const date = new Date(base + minutes * 60_000);
      if (date <= now) return;
      requests.push({
        identifier: followUpIdentifier(alarm.key, index),
        alarmKey: alarm.key,
        date,
        title: alarm.title,
        body: alarm.body,
        source: alarm.source,
        signature: [alarm.title, alarm.body, date.toISOString()].join('|'),
      });
    });
  }
  requests.sort((a, b) => a.date.getTime() - b.date.getTime() || a.identifier.localeCompare(b.identifier));
  return requests.slice(0, FOLLOW_UP_LIMIT);
}

export function diffFollowUps(
  desired: FollowUpRequest[],
  existing: ScheduledFollowUp[],
): { toSchedule: FollowUpRequest[]; toCancel: string[] } {
  const ours = existing.filter((e) => e.identifier.startsWith(FOLLOW_UP_PREFIX));
  const existingById = new Map(ours.map((e) => [e.identifier, e.signature]));
  const desiredById = new Map(desired.map((d) => [d.identifier, d]));

  const toCancel = ours
    .filter((e) => desiredById.get(e.identifier)?.signature !== e.signature)
    .map((e) => e.identifier);
  const toSchedule = desired.filter((d) => existingById.get(d.identifier) !== d.signature);
  return { toSchedule, toCancel };
}

/** Marks outlive the alarm they answer by a margin, then go: storage shouldn't grow forever. */
export function pruneMarks(marks: AlarmMarks, now: Date): AlarmMarks {
  const cutoff = now.getTime() - 2 * RINGING_WINDOW_MS - 24 * 60 * 60 * 1000;
  return Object.fromEntries(Object.entries(marks).filter(([, mark]) => new Date(mark.updatedAt).getTime() > cutoff));
}
