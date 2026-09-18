/**
 * Pulls a due date out of the end of a spoken task.
 *
 * "buy milk tomorrow" is a task called "buy milk", due tomorrow. "call mum
 * about Friday's party" is a task called exactly that, due whenever. Telling
 * those apart is the whole job, and it is done with two rules rather than a
 * model:
 *
 * 1. **Anchored.** A date phrase only counts at the very end of the sentence,
 *    optionally introduced by `by`, `due`, `on`, `at` or `for`. Anything
 *    earlier is part of what the task is about.
 * 2. **Never leaves a stump.** If stripping the phrase would empty the title,
 *    or leave it dangling on a word like "about" or "with", the phrase was
 *    part of the title after all and nothing is stripped.
 *
 * Nothing here imports anything: it is a pure function over a string and a
 * clock, which is what lets `node --test` run it directly.
 */

export type ParsedWhen = {
  /** The due date, or null when nothing in the text named one. */
  dueAt: Date | null;
  /** The text with the date phrase removed — what the task is actually called. */
  rest: string;
};

/** A date with no spoken time lands here, so it reads back as the day that was said. */
const DEFAULT_HOUR = 9;
const MORNING_HOUR = 9;
const AFTERNOON_HOUR = 14;
const EVENING_HOUR = 20;

const WEEKDAYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

/** Spoken month names and the abbreviations recognizers tend to produce. */
const MONTHS: Record<string, number> = {
  january: 0, jan: 0,
  february: 1, feb: 1,
  march: 2, mar: 2,
  april: 3, apr: 3,
  may: 4,
  june: 5, jun: 5,
  july: 6, jul: 6,
  august: 7, aug: 7,
  september: 8, sept: 8, sep: 8,
  october: 9, oct: 9,
  november: 10, nov: 10,
  december: 11, dec: 11,
};

const NUMBER_WORDS: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
};

/**
 * A title ending in one of these was never a title plus a date — it was a
 * sentence about a day. "call mum about friday" keeps its Friday.
 */
const DANGLING_WORDS = new Set([
  'about', 'with', 'the', 'a', 'an', 'of', 'and', 'to', 'from', 'is', 'it',
  'that', 'this', 'their', 'my', 'your', 'our', 'his', 'her',
]);

/** `by`, `due`, `on`, `at`, `for` — swallowed with the phrase they introduce. */
const INTRO = String.raw`(?:\b(?:by|due|on|at|for)\s+)?`;
const MONTH_NAMES = Object.keys(MONTHS).join('|');
const WEEKDAY_NAMES = WEEKDAYS.join('|');
const COUNT_WORDS = Object.keys(NUMBER_WORDS).join('|');

function atTime(base: Date, hour: number, minute: number): Date {
  const result = new Date(base);
  result.setHours(hour, minute, 0, 0);
  return result;
}

function addDays(base: Date, days: number): Date {
  const result = new Date(base);
  result.setDate(result.getDate() + days);
  return result;
}

/** The next time this weekday comes around — never today, so "on Friday" said on a Friday means the next one. */
function nextWeekday(now: Date, weekday: number): Date {
  const delta = (weekday - now.getDay() + 7) % 7 || 7;
  return addDays(now, delta);
}

/**
 * What a bare hour means. Speech rarely carries am/pm, and "at 5" is the
 * afternoon far more often than it is dawn.
 */
function resolveHour(hour: number, meridiem: string | undefined): number | null {
  const suffix = meridiem?.replace(/\./g, '').toLowerCase();
  if (suffix === 'am') return hour === 12 ? 0 : hour;
  if (suffix === 'pm') return hour === 12 ? 12 : hour + 12;
  if (hour === 0) return 0;
  if (hour >= 13) return hour; // already said in 24-hour terms
  if (hour === 12) return 12; // "at 12" is midday
  if (hour <= 6) return hour + 12; // "at 5" is the afternoon
  return hour; // 7 through 11 are the morning
}

type TimeMatch = { hour: number; minute: number; index: number };

function matchTrailingTime(text: string): TimeMatch | null {
  const named = new RegExp(String.raw`\b(?:at\s+)?(noon|midday|midnight)\s*$`, 'i').exec(text);
  if (named) {
    const word = named[1].toLowerCase();
    return { hour: word === 'midnight' ? 0 : 12, minute: 0, index: named.index };
  }

  // Either "at" introduces it, or an am/pm makes it unmistakable — otherwise a
  // task ending in a number ("buy 2") would sprout a due time.
  const clock =
    new RegExp(String.raw`\bat\s+(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?\s*$`, 'i').exec(text) ??
    new RegExp(String.raw`\b(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)\s*$`, 'i').exec(text);
  if (!clock) return null;

  const hour = resolveHour(Number(clock[1]), clock[3]);
  const minute = clock[2] ? Number(clock[2]) : 0;
  if (hour === null || hour > 23 || minute > 59) return null;
  return { hour, minute, index: clock.index };
}

type DateMatch = { date: Date; hour?: number; minute?: number; index: number };

function matchTrailingDate(text: string, now: Date): DateMatch | null {
  const today = new RegExp(`${INTRO}(today)\\s*$`, 'i').exec(text);
  if (today) return { date: new Date(now), index: today.index };

  const tonight = new RegExp(`${INTRO}(?:tonight|this evening)\\s*$`, 'i').exec(text);
  if (tonight) return { date: new Date(now), hour: EVENING_HOUR, index: tonight.index };

  const tomorrow = new RegExp(`${INTRO}tomorrow(?:\\s+(morning|afternoon|evening|night))?\\s*$`, 'i').exec(text);
  if (tomorrow) {
    const part = tomorrow[1]?.toLowerCase();
    const hour =
      part === 'morning' ? MORNING_HOUR
      : part === 'afternoon' ? AFTERNOON_HOUR
      : part === 'evening' || part === 'night' ? EVENING_HOUR
      : undefined;
    return { date: addDays(now, 1), hour, index: tomorrow.index };
  }

  const weekend = new RegExp(`${INTRO}(?:this |next )?weekend\\s*$`, 'i').exec(text);
  if (weekend) return { date: nextWeekday(now, 6), index: weekend.index };

  const nextWeek = new RegExp(`${INTRO}next week\\s*$`, 'i').exec(text);
  if (nextWeek) return { date: addDays(now, 7), index: nextWeek.index };

  const nextMonth = new RegExp(`${INTRO}next month\\s*$`, 'i').exec(text);
  if (nextMonth) {
    const date = new Date(now);
    date.setMonth(date.getMonth() + 1);
    return { date, index: nextMonth.index };
  }

  // "next Friday" and "Friday" both mean the coming Friday. A to-do that
  // arrives early is recoverable; one buried a week further away is not.
  const weekday = new RegExp(`${INTRO}(?:next\\s+|this\\s+)?(${WEEKDAY_NAMES})\\s*$`, 'i').exec(text);
  if (weekday) {
    const index = WEEKDAYS.indexOf(weekday[1].toLowerCase() as (typeof WEEKDAYS)[number]);
    return { date: nextWeekday(now, index), index: weekday.index };
  }

  const relative = new RegExp(
    String.raw`\bin\s+(\d{1,3}|${COUNT_WORDS})\s+(minute|hour|day|week)s?\s*$`,
    'i',
  ).exec(text);
  if (relative) {
    const raw = relative[1].toLowerCase();
    const count = NUMBER_WORDS[raw] ?? Number(raw);
    const unit = relative[2].toLowerCase();
    if (!Number.isFinite(count) || count <= 0) return null;
    const date = new Date(now);
    if (unit === 'minute') date.setMinutes(date.getMinutes() + count);
    else if (unit === 'hour') date.setHours(date.getHours() + count);
    else if (unit === 'day') date.setDate(date.getDate() + count);
    else date.setDate(date.getDate() + count * 7);
    // A relative offset already carries its own time of day, to the minute:
    // "in 20 minutes" is not "in 20 minutes, rounded to the hour".
    return { date, hour: date.getHours(), minute: date.getMinutes(), index: relative.index };
  }

  const monthFirst = new RegExp(`${INTRO}(${MONTH_NAMES})\\s+(\\d{1,2})(?:st|nd|rd|th)?\\s*$`, 'i').exec(text);
  const dayFirst = new RegExp(
    `${INTRO}(?:the\\s+)?(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?(${MONTH_NAMES})\\s*$`,
    'i',
  ).exec(text);
  const calendar = monthFirst
    ? { month: monthFirst[1], day: monthFirst[2], index: monthFirst.index }
    : dayFirst
      ? { month: dayFirst[2], day: dayFirst[1], index: dayFirst.index }
      : null;
  if (calendar) {
    const month = MONTHS[calendar.month.toLowerCase()];
    const day = Number(calendar.day);
    const date = new Date(now.getFullYear(), month, day);
    // A day the month doesn't have ("February 31st") was never a date.
    if (date.getMonth() !== month || date.getDate() !== day) return null;
    if (atTime(date, 23, 59) < now) date.setFullYear(date.getFullYear() + 1);
    return { date, index: calendar.index };
  }

  return null;
}

/** Would stripping this leave a title that reads like an unfinished sentence? */
function leavesAStump(rest: string): boolean {
  if (!rest) return true;
  const lastWord = rest.split(/\s+/).pop()?.toLowerCase() ?? '';
  return DANGLING_WORDS.has(lastWord);
}

export function parseWhen(text: string, now: Date): ParsedWhen {
  const source = text.trim();
  if (!source) return { dueAt: null, rest: '' };

  // "tomorrow at 5" puts the time last; "at 5 tomorrow" puts the date last.
  // Take whichever is at the end, then look again for the other one.
  let rest = source;
  let time = matchTrailingTime(rest);
  if (time) rest = rest.slice(0, time.index).trimEnd();

  const date = matchTrailingDate(rest, now);
  if (date) rest = rest.slice(0, date.index).trimEnd();

  if (!time && date) {
    time = matchTrailingTime(rest);
    if (time) rest = rest.slice(0, time.index).trimEnd();
  }

  if (!time && !date) return { dueAt: null, rest: source };

  rest = rest.replace(/[\s,]+$/, '');
  if (leavesAStump(rest)) return { dueAt: null, rest: source };

  if (date) {
    const hour = time ? time.hour : (date.hour ?? DEFAULT_HOUR);
    const minute = time ? time.minute : (date.minute ?? 0);
    return { dueAt: atTime(date.date, hour, minute), rest };
  }

  // A time with no day: today if it hasn't passed, otherwise tomorrow.
  const todayAt = atTime(now, time!.hour, time!.minute);
  return { dueAt: todayAt > now ? todayAt : addDays(todayAt, 1), rest };
}
