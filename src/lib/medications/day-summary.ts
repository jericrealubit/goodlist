/**
 * One verdict per day across every medicine, for the calendar's corner mark.
 *
 * The calendar shows a day's medicines as a single mark rather than one per
 * dose: a cell already carries a numeral and up to three task dots, and what a
 * month view is for is spotting the *pattern* of bad days, not reading doses.
 */
import type { DayKey } from '../calendar/day.ts';
import { slotKey, slotStatus, type DoseRecord } from './adherence.ts';
import { slotsForDayAll, type Schedulable } from './schedule.ts';

/**
 * - `taken`: every dose that day was taken.
 * - `missed`: at least one dose was missed — the one that matters.
 * - `skipped`: nothing missed, but at least one deliberately skipped. Kept apart
 *   from `missed` because a doctor can say to skip, and marking that with an X
 *   would call it a failure.
 */
export type DayVerdict = 'taken' | 'missed' | 'skipped';

export type DaySummary = {
  verdict: DayVerdict;
  taken: number;
  skipped: number;
  missed: number;
};

/**
 * Null when there is nothing to judge yet: no medicine that day, a future day,
 * or a day with a dose still upcoming or inside its grace window. Giving a
 * verdict on today at 09:00 would show a check that the evening dose can still
 * turn into an X.
 */
export function summarizeDay(
  meds: Schedulable[],
  doses: Map<string, DoseRecord>,
  day: DayKey,
  now: Date,
): DaySummary | null {
  const slots = slotsForDayAll(meds, day);
  if (slots.length === 0) return null;

  let taken = 0;
  let skipped = 0;
  let missed = 0;
  for (const slot of slots) {
    const status = slotStatus(slot, doses.get(slotKey(slot.medicationId, slot.day, slot.time)), now);
    if (status === 'upcoming' || status === 'due') return null;
    if (status === 'taken') taken += 1;
    else if (status === 'skipped') skipped += 1;
    else missed += 1;
  }

  const verdict: DayVerdict = missed > 0 ? 'missed' : skipped > 0 ? 'skipped' : 'taken';
  return { verdict, taken, skipped, missed };
}

/** Spoken form for a day's accessibility label, e.g. "medicines: 1 missed, 2 taken". */
export function describeDaySummary(summary: DaySummary): string {
  const parts: string[] = [];
  if (summary.missed) parts.push(`${summary.missed} missed`);
  if (summary.skipped) parts.push(`${summary.skipped} skipped`);
  if (summary.taken) parts.push(summary.missed || summary.skipped ? `${summary.taken} taken` : 'all taken');
  return `medicines: ${parts.join(', ')}`;
}
