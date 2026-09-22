/**
 * What happened to each dose slot, and how well a schedule is being kept.
 *
 * Only *taken* and *skipped* are ever stored. "Missed" is derived — a slot
 * whose grace window has passed with nothing logged — which is why no server
 * job has to wake up at 08:01 to write anything.
 */
import type { DayKey } from '../calendar/day.ts';
import { daysEndingOn, slotsForDay, type Schedulable, type Slot } from './schedule.ts';

export type LoggedStatus = 'taken' | 'skipped';
export type SlotStatus = LoggedStatus | 'upcoming' | 'due' | 'missed';

/** The parts of a dose row this module needs. `MedicationDose` satisfies it. */
export type DoseRecord = {
  medication_id: string;
  slot_date: DayKey;
  slot_time: string;
  status: LoggedStatus;
};

/**
 * How long after its time a slot still reads as "due" rather than "missed".
 * An hour: long enough that finishing breakfast first isn't a failure, short
 * enough that a forgotten dose shows up the same morning.
 */
export const MISSED_GRACE_MINUTES = 60;

export function slotKey(medicationId: string, day: DayKey, time: string): string {
  return `${medicationId}|${day}|${time}`;
}

export function indexDoses<T extends DoseRecord>(doses: T[]): Map<string, T> {
  return new Map(doses.map((dose) => [slotKey(dose.medication_id, dose.slot_date, dose.slot_time), dose]));
}

export function slotStatus(slot: Slot, dose: DoseRecord | undefined, now: Date): SlotStatus {
  if (dose) return dose.status;
  const elapsed = now.getTime() - slot.at.getTime();
  if (elapsed < 0) return 'upcoming';
  if (elapsed < MISSED_GRACE_MINUTES * 60_000) return 'due';
  return 'missed';
}

export type Adherence = {
  taken: number;
  skipped: number;
  missed: number;
  /** Taken as a share of every slot that has resolved, 0–100; null when none has. */
  percent: number | null;
  /** Consecutive days, counting back from the latest resolved one, on which every slot was taken. */
  streak: number;
};

/**
 * Adherence over the `days` days ending on `today`. Slots still upcoming or
 * inside their grace window are left out entirely — counting them as missed
 * would punish someone for it being 07:59.
 */
export function adherence(
  med: Schedulable,
  doses: Map<string, DoseRecord>,
  today: DayKey,
  days: number,
  now: Date,
): Adherence {
  let taken = 0;
  let skipped = 0;
  let missed = 0;
  // Per day: true = every resolved slot taken, false = one wasn't, null = nothing resolved yet.
  const dayResults: (boolean | null)[] = [];

  for (const day of daysEndingOn(today, days)) {
    let resolved = 0;
    let allTaken = true;
    for (const slot of slotsForDay(med, day)) {
      const status = slotStatus(slot, doses.get(slotKey(slot.medicationId, slot.day, slot.time)), now);
      if (status === 'upcoming' || status === 'due') continue;
      resolved += 1;
      if (status === 'taken') taken += 1;
      else {
        allTaken = false;
        if (status === 'skipped') skipped += 1;
        else missed += 1;
      }
    }
    dayResults.push(resolved === 0 ? null : allTaken);
  }

  let streak = 0;
  for (let i = dayResults.length - 1; i >= 0; i -= 1) {
    const result = dayResults[i];
    if (result === null) continue; // a rest day, or today before the first dose — neither breaks it
    if (!result) break;
    streak += 1;
  }

  const total = taken + skipped + missed;
  return { taken, skipped, missed, percent: total === 0 ? null : Math.round((taken / total) * 100), streak };
}
