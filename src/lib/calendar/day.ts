/**
 * Local-day primitives for the calendar.
 *
 * `due_at` is a UTC instant, and three entry points bake three different times
 * into it: the web date picker writes local midnight, the native picker carries
 * over whatever o'clock it was when it opened, and the voice parser writes
 * 09:00. So the only safe way to ask "which day is this on?" is to read the
 * *local* year, month and date — never to slice the ISO string, which puts a
 * local-midnight task on the previous day anywhere east of UTC.
 * `src/components/due-date-picker.web.tsx` documents the same trap.
 *
 * Nothing here imports anything: a pure module over `Date`, which is what lets
 * `node --test` run it directly.
 *
 * `addDays` has a twin in `src/lib/voice/parse-when.ts`. It is duplicated on
 * purpose — that file's stated virtue is importing nothing, it is pinned by its
 * own suite, and sharing would couple two modules that have no reason to change
 * together.
 */

/** A local calendar day as `YYYY-MM-DD`. Never parse this with `new Date(string)`. */
export type DayKey = string;

/**
 * The hour a due date lands on when the calendar sets one. Matches
 * `DEFAULT_HOUR` in parse-when.ts, so a spoken date and a tapped date agree.
 */
export const DUE_HOUR = 9;

function pad(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

/** Local Y-M-D. The only correct way to ask which day an instant falls on. */
export function toDayKey(date: Date): DayKey {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Midnight local on that day, or null when the key isn't one. */
export function fromDayKey(key: DayKey): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);

  // A day the month doesn't have rolls forward — "2026-02-31" becomes March.
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
    return null;
  }
  return date;
}

export function startOfLocalDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function addDays(base: Date, days: number): Date {
  const result = new Date(base);
  result.setDate(result.getDate() + days);
  return result;
}

/** Day 0 of the following month is the last day of this one. */
function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Calendar-month arithmetic that doesn't overflow. A bare `setMonth` turns
 * 31 January into 3 March; this clamps to the 28th or 29th instead. The time of
 * day is carried through untouched.
 */
export function addMonths(base: Date, months: number): Date {
  const absolute = base.getMonth() + months;
  const year = base.getFullYear() + Math.floor(absolute / 12);
  const month = ((absolute % 12) + 12) % 12;
  const day = Math.min(base.getDate(), daysInMonth(year, month));

  const result = new Date(base);
  result.setFullYear(year, month, day);
  return result;
}

export function isSameLocalDay(a: Date, b: Date): boolean {
  return toDayKey(a) === toDayKey(b);
}

/**
 * Day-level, never instant-level: a task due today at 00:00 is not overdue at
 * 23:00. `YYYY-MM-DD` sorts lexicographically exactly as it sorts
 * chronologically, so whichever of the three hours got stored cannot change the
 * answer. That is the whole reason for the key format.
 */
export function isOverdue(dueAt: Date, now: Date): boolean {
  return toDayKey(dueAt) < toDayKey(now);
}

/**
 * The instant to store for a task scheduled on `day` — always 09:00 local.
 *
 * Normalising rather than preserving is a deliberate choice: of the three
 * writers only the native picker's carried-over time is non-deterministic, and
 * "the morning of that day" is what a person means by a due date.
 */
export function withDueTime(day: Date): Date {
  const result = new Date(day);
  result.setHours(DUE_HOUR, 0, 0, 0);
  return result;
}
