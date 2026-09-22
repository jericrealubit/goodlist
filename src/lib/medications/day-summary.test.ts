import assert from 'node:assert/strict';
import { test } from 'node:test';

import { indexDoses, type DoseRecord } from './adherence.ts';
import { describeDaySummary, summarizeDay } from './day-summary.ts';
import type { Schedulable } from './schedule.ts';

function med(id: string, times: string[], overrides: Partial<Schedulable> = {}): Schedulable {
  return { id, times, days_of_week: null, start_date: '2026-09-01', end_date: null, archived_at: null, ...overrides };
}

function dose(id: string, day: string, time: string, status: DoseRecord['status'] = 'taken'): DoseRecord {
  return { medication_id: id, slot_date: day, slot_time: time, status };
}

const MEDS = [med('a', ['08:00', '20:00']), med('b', ['12:00'])];
const LATE = new Date(2026, 8, 23, 23, 30);

test('no medicine that day means no mark', () => {
  const weekly = [med('a', ['08:00'], { days_of_week: [1] })]; // Mondays; 23 Sep 2026 is a Wednesday
  assert.equal(summarizeDay(weekly, new Map(), '2026-09-23', LATE), null);
});

test('every dose taken is a check', () => {
  const doses = indexDoses([dose('a', '2026-09-23', '08:00'), dose('a', '2026-09-23', '20:00'), dose('b', '2026-09-23', '12:00')]);
  const summary = summarizeDay(MEDS, doses, '2026-09-23', LATE);
  assert.deepEqual(summary, { verdict: 'taken', taken: 3, skipped: 0, missed: 0 });
  assert.equal(describeDaySummary(summary!), 'medicines: all taken');
});

test('one missed dose makes the day an X, whatever else was taken or skipped', () => {
  const doses = indexDoses([dose('a', '2026-09-23', '08:00'), dose('b', '2026-09-23', '12:00', 'skipped')]);
  const summary = summarizeDay(MEDS, doses, '2026-09-23', LATE)!;
  assert.equal(summary.verdict, 'missed');
  assert.equal(describeDaySummary(summary), 'medicines: 1 missed, 1 skipped, 1 taken');
});

test('skipped with nothing missed is its own verdict, not an X', () => {
  const doses = indexDoses([
    dose('a', '2026-09-23', '08:00'),
    dose('a', '2026-09-23', '20:00', 'skipped'),
    dose('b', '2026-09-23', '12:00'),
  ]);
  assert.equal(summarizeDay(MEDS, doses, '2026-09-23', LATE)?.verdict, 'skipped');
});

test('no verdict while any dose is still to come or inside its grace window', () => {
  const doses = indexDoses([dose('a', '2026-09-23', '08:00'), dose('b', '2026-09-23', '12:00')]);
  // 13:00 — the 20:00 dose hasn't come yet, so the day is still open.
  assert.equal(summarizeDay(MEDS, doses, '2026-09-23', new Date(2026, 8, 23, 13, 0)), null);
  // 20:30 — inside 20:00's grace window: not missed yet either.
  assert.equal(summarizeDay(MEDS, doses, '2026-09-23', new Date(2026, 8, 23, 20, 30)), null);
});

test('a future day has no verdict', () => {
  assert.equal(summarizeDay(MEDS, new Map(), '2026-09-24', LATE), null);
});

test('an unlogged past day is all missed', () => {
  assert.deepEqual(summarizeDay(MEDS, new Map(), '2026-09-22', LATE), {
    verdict: 'missed',
    taken: 0,
    skipped: 0,
    missed: 3,
  });
});
