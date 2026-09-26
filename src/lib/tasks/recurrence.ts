/**
 * Which days a repeating task lands on, and which of its occurrences belong
 * in the task list.
 *
 * A series is a template (`task_recurrences` in supabase/schema.sql); every
 * occurrence is an ordinary task row that points back at it. This module
 * decides which occurrence dates *should* exist inside a window. It never
 * writes anything — the sync in src/hooks/use-task-recurrences.ts does that.
 *
 * Dates are local `YYYY-MM-DD` day keys throughout, stepped with `addDays`
 * rather than millisecond arithmetic, so a DST night can't skip or repeat a
 * day — the same discipline as src/lib/medications/schedule.ts.
 *
 * Structurally typed and free of `@/` aliases, so `node --test` runs it
 * directly.
 */
import { addDays, fromDayKey, toDayKey, type DayKey } from '../calendar/day.ts';

/**
 * 'monthly' lands on a day of the month ("the 11th"); 'monthly_weekday' on a
 * weekday within the month ("the second Sunday", "the last Friday").
 */
export type RecurrenceFrequency = 'daily' | 'weekly' | 'fortnightly' | 'monthly' | 'monthly_weekday' | 'custom';

export const RECURRENCE_FREQUENCIES: RecurrenceFrequency[] = [
  'daily',
  'weekly',
  'fortnightly',
  'monthly',
  'monthly_weekday',
  'custom',
];

/** `month_week` for "the last one in the month" — lands every month, even those without a fifth. */
export const LAST_WEEK = 5;

/** The parts of a series the expansion needs. `TaskRecurrence` satisfies it. */
export type RecurrencePattern = {
  frequency: RecurrenceFrequency;
  /**
   * 0 = Sunday … 6 = Saturday. 'custom' reads all of them; 'monthly_weekday'
   * reads the first as its weekday, or takes the start date's when null.
   */
  days_of_week: number[] | null;
  /** 'monthly' only: 1–31, clamped to short months. Null keeps the start date's day. */
  month_day?: number | null;
  /** 'monthly_weekday' only: 1–4, or LAST_WEEK. Null keeps the start date's week. */
  month_week?: number | null;
  /** The first occurrence's day; weekly, fortnightly and monthly count from it. */
  start_date: DayKey;
  end_date: DayKey | null;
  skipped_dates: DayKey[];
  active: boolean;
};

/**
 * How far ahead occurrences are made: whichever comes first of ~90 days or a
 * dozen occurrences. A daily task gets the next 12 days, a monthly one the
 * next three months — enough for the calendar to show the pattern without a
 * daily task filling the database with a year of rows.
 */
export const WINDOW_DAYS = 90;
export const WINDOW_MAX_OCCURRENCES = 12;

/** Whole days from a to b, counted on the calendar — DST-proof. */
function daysBetween(a: Date, b: Date): number {
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((utcB - utcA) / 86_400_000);
}

function daysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

/** Which of its month's same weekdays `date` is: 1–4, or LAST_WEEK for a fifth. */
export function weekOfMonth(date: Date): number {
  return Math.ceil(date.getDate() / 7);
}

/** Whether a series only reads `days_of_week` when it's this frequency. */
export function usesDaysOfWeek(frequency: RecurrenceFrequency): boolean {
  return frequency === 'custom' || frequency === 'monthly_weekday';
}

/** The day of the month a 'monthly' series lands on. */
export function monthDayOf(pattern: Pick<RecurrencePattern, 'month_day' | 'start_date'>): number | null {
  if (pattern.month_day) return pattern.month_day;
  return fromDayKey(pattern.start_date)?.getDate() ?? null;
}

/** The week and weekday a 'monthly_weekday' series lands on. */
export function monthWeekdayOf(
  pattern: Pick<RecurrencePattern, 'month_week' | 'days_of_week' | 'start_date'>,
): { week: number; weekday: number } | null {
  const start = fromDayKey(pattern.start_date);
  const week = pattern.month_week ?? (start ? weekOfMonth(start) : null);
  const weekday = pattern.days_of_week?.[0] ?? start?.getDay() ?? null;
  return week === null || weekday === null ? null : { week, weekday };
}

/**
 * Whether `day` is one the pattern lands on, ignoring the window, skips and
 * `active`. Monthly keeps to its day of the month, clamped to the month's
 * last day — a series on the 31st lands on the 30th in April and the 28th or
 * 29th in February, never skips a month. "The last Sunday" is the same
 * promise for weekdays: the fifth where there is one, else the fourth.
 */
export function landsOn(pattern: RecurrencePattern, day: DayKey): boolean {
  const date = fromDayKey(day);
  const start = fromDayKey(pattern.start_date);
  if (!date || !start) return false;
  if (day < pattern.start_date) return false;
  if (pattern.end_date && day > pattern.end_date) return false;

  switch (pattern.frequency) {
    case 'daily':
      return true;
    case 'weekly':
      return daysBetween(start, date) % 7 === 0;
    case 'fortnightly':
      return daysBetween(start, date) % 14 === 0;
    case 'monthly': {
      const monthDay = monthDayOf(pattern) ?? start.getDate();
      return date.getDate() === Math.min(monthDay, daysInMonth(date));
    }
    case 'monthly_weekday': {
      const target = monthWeekdayOf(pattern);
      if (!target || date.getDay() !== target.weekday) return false;
      if (target.week >= LAST_WEEK) return date.getDate() + 7 > daysInMonth(date);
      return weekOfMonth(date) === target.week;
    }
    case 'custom':
      return !!pattern.days_of_week?.includes(date.getDay());
  }
}

/** The first day on or after `from` the series lands on, within about a year — or null. */
export function nextOccurrence(pattern: RecurrencePattern, from: DayKey): DayKey | null {
  return occurrenceDates({ ...pattern, skipped_dates: [], active: true }, from, { days: 400, max: 1 })[0] ?? null;
}

/**
 * The occurrence dates that should exist from `today` on, capped by the
 * rolling window. Deliberately doesn't reach back before today: a phone
 * that wasn't opened for a fortnight shouldn't come back to a pile of
 * overdue copies of a daily chore.
 */
export function occurrenceDates(
  pattern: RecurrencePattern,
  today: DayKey,
  { days = WINDOW_DAYS, max = WINDOW_MAX_OCCURRENCES }: { days?: number; max?: number } = {},
): DayKey[] {
  if (!pattern.active) return [];
  const first = fromDayKey(today > pattern.start_date ? today : pattern.start_date);
  const todayDate = fromDayKey(today);
  if (!first || !todayDate) return [];

  const last = addDays(todayDate, days - 1);
  const skipped = new Set(pattern.skipped_dates);
  const result: DayKey[] = [];

  for (let cursor = first; cursor <= last && result.length < max; cursor = addDays(cursor, 1)) {
    const key = toDayKey(cursor);
    if (pattern.end_date && key > pattern.end_date) break;
    if (!skipped.has(key) && landsOn(pattern, key)) result.push(key);
  }
  return result;
}

/** What the task list needs of a task to decide whether a repeating one shows. */
export type ListableTask = {
  recurrence_id: string | null;
  occurrence_date: DayKey | null;
};

/**
 * The task list shows a repeating task's occurrences once their day arrives
 * (today's, and any overdue), and otherwise just the next one — so a daily
 * chore is one row, not twelve. The calendar is where the future ones live.
 * Everything that isn't an occurrence passes through untouched, in order.
 */
export function visibleInTaskList<T extends ListableTask>(tasks: T[], today: DayKey): T[] {
  const soonestFuture = new Map<string, T>();
  for (const task of tasks) {
    if (!task.recurrence_id || !task.occurrence_date || task.occurrence_date <= today) continue;
    const current = soonestFuture.get(task.recurrence_id);
    if (!current || task.occurrence_date < current.occurrence_date!) soonestFuture.set(task.recurrence_id, task);
  }

  const hasArrived = new Set<string>();
  for (const task of tasks) {
    if (task.recurrence_id && task.occurrence_date && task.occurrence_date <= today) hasArrived.add(task.recurrence_id);
  }

  return tasks.filter((task) => {
    if (!task.recurrence_id || !task.occurrence_date) return true;
    if (task.occurrence_date <= today) return true;
    return !hasArrived.has(task.recurrence_id) && soonestFuture.get(task.recurrence_id) === task;
  });
}

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const WEEK_WORDS = ['', 'first', 'second', 'third', 'fourth', 'last'];

/** "first" … "fourth", "last". */
export function weekWord(week: number): string {
  return WEEK_WORDS[Math.min(Math.max(week, 1), LAST_WEEK)];
}

export function ordinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
}

/**
 * "Every week on Monday", "Every Mon, Wed and Fri", "Every month on the 15th",
 * "Every month on the second Sunday".
 */
export function describeRecurrence(
  pattern: Pick<RecurrencePattern, 'frequency' | 'days_of_week' | 'start_date' | 'month_day' | 'month_week'>,
): string {
  const start = fromDayKey(pattern.start_date);
  const weekday = start ? WEEKDAY_NAMES[start.getDay()] : '';
  switch (pattern.frequency) {
    case 'daily':
      return 'Every day';
    case 'weekly':
      return `Every week on ${weekday}`;
    case 'fortnightly':
      return `Every 2 weeks on ${weekday}`;
    case 'monthly': {
      const monthDay = monthDayOf(pattern);
      return monthDay ? `Every month on the ${ordinal(monthDay)}` : 'Every month';
    }
    case 'monthly_weekday': {
      const target = monthWeekdayOf(pattern);
      return target ? `Every month on the ${weekWord(target.week)} ${WEEKDAY_NAMES[target.weekday]}` : 'Every month';
    }
    case 'custom': {
      const days = [...new Set(pattern.days_of_week ?? [])].sort((a, b) => a - b);
      if (days.length === 7) return 'Every day';
      const names = days.map((d) => WEEKDAY_SHORT[d]);
      if (names.length <= 1) return `Every ${names[0] ?? 'week'}`;
      return `Every ${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
    }
  }
}
