/**
 * Expands a medication's schedule into the dose *slots* it asks for.
 *
 * A slot is a local wall-clock moment — "08:00 on 2026-09-23" — never a UTC
 * instant. A person takes their tablet at breakfast wherever breakfast is, so
 * the schedule is stored as `HH:MM` strings and a slot is built with local
 * constructors. That also keeps a DST day honest: 08:00 is 08:00 whether the
 * night before was 23 or 25 hours long.
 *
 * Structurally typed, like `src/lib/calendar/bucket.ts`, so the tests pass plain
 * objects and nothing here needs an `@/` alias.
 */
import { addDays, fromDayKey, toDayKey, type DayKey } from '../calendar/day.ts';

/** The parts of a medication the schedule needs. `Medication` satisfies it. */
export type Schedulable = {
  id: string;
  /** Local wall-clock times, `HH:MM`, 24-hour. */
  times: string[];
  /** 0 = Sunday … 6 = Saturday, as `Date.getDay()`. Null means every day. */
  days_of_week: number[] | null;
  start_date: DayKey;
  end_date: DayKey | null;
  archived_at: string | null;
};

export type Slot = {
  medicationId: string;
  day: DayKey;
  time: string;
  /** Local instant of the slot, for comparing against "now". */
  at: Date;
};

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** `HH:MM` → hour and minute, or null. Matches the database's check constraint. */
export function parseTime(value: string): { hour: number; minute: number } | null {
  const match = TIME_PATTERN.exec(value);
  if (!match) return null;
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

export function formatTime(hour: number, minute: number): string {
  return `${hour < 10 ? '0' : ''}${hour}:${minute < 10 ? '0' : ''}${minute}`;
}

/** Valid times, de-duplicated and in the order a day runs. */
export function normalizeTimes(times: string[]): string[] {
  return [...new Set(times.filter((t) => parseTime(t) !== null))].sort();
}

export function isScheduledOn(med: Schedulable, day: DayKey): boolean {
  if (med.archived_at) return false;
  // Keys compare lexicographically exactly as they compare chronologically.
  if (day < med.start_date) return false;
  if (med.end_date && day > med.end_date) return false;
  if (!med.days_of_week) return true;

  const date = fromDayKey(day);
  return !!date && med.days_of_week.includes(date.getDay());
}

export function slotsForDay(med: Schedulable, day: DayKey): Slot[] {
  if (!isScheduledOn(med, day)) return [];
  const date = fromDayKey(day);
  if (!date) return [];

  return normalizeTimes(med.times).map((time) => {
    const { hour, minute } = parseTime(time)!;
    const at = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, minute);
    return { medicationId: med.id, day, time, at };
  });
}

/** Every slot of every medication on one day, earliest first. */
export function slotsForDayAll(meds: Schedulable[], day: DayKey): Slot[] {
  return meds
    .flatMap((med) => slotsForDay(med, day))
    .sort((a, b) => a.at.getTime() - b.at.getTime() || a.medicationId.localeCompare(b.medicationId));
}

/**
 * The `count` days ending on `last`, oldest first. Stepped with `addDays`, never
 * `+ 86_400_000`, so a DST change can't skip or repeat a day.
 */
export function daysEndingOn(last: DayKey, count: number): DayKey[] {
  const end = fromDayKey(last);
  if (!end || count <= 0) return [];
  const days: DayKey[] = [];
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    days.push(toDayKey(addDays(end, -offset)));
  }
  return days;
}
