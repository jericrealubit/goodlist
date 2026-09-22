import assert from 'node:assert/strict';
import { test } from 'node:test';

import { adherence, indexDoses, MISSED_GRACE_MINUTES, slotStatus, type DoseRecord } from './adherence.ts';
import { slotsForDay, type Schedulable } from './schedule.ts';

const MED: Schedulable = {
  id: 'm1',
  times: ['08:00', '20:00'],
  days_of_week: null,
  start_date: '2026-09-01',
  end_date: null,
  archived_at: null,
};

function dose(day: string, time: string, status: DoseRecord['status'] = 'taken'): DoseRecord {
  return { medication_id: 'm1', slot_date: day, slot_time: time, status };
}

test('a slot is upcoming, then due for the grace window, then missed', () => {
  const [slot] = slotsForDay(MED, '2026-09-23');
  assert.equal(slotStatus(slot, undefined, new Date(2026, 8, 23, 7, 59)), 'upcoming');
  assert.equal(slotStatus(slot, undefined, new Date(2026, 8, 23, 8, 0)), 'due');
  assert.equal(slotStatus(slot, undefined, new Date(2026, 8, 23, 8, MISSED_GRACE_MINUTES - 1)), 'due');
  assert.equal(slotStatus(slot, undefined, new Date(2026, 8, 23, 8, MISSED_GRACE_MINUTES)), 'missed');
});

test('a logged dose wins over the clock', () => {
  const [slot] = slotsForDay(MED, '2026-09-23');
  const early = new Date(2026, 8, 23, 6, 0);
  assert.equal(slotStatus(slot, dose('2026-09-23', '08:00'), early), 'taken');
  assert.equal(slotStatus(slot, dose('2026-09-23', '08:00', 'skipped'), early), 'skipped');
});

test('a late-evening dose belongs to its own day, not the next', () => {
  const doses = indexDoses([dose('2026-09-22', '20:00')]);
  // Just after midnight: yesterday's 20:00 is taken, today's 08:00 hasn't come.
  const result = adherence(MED, doses, '2026-09-23', 1, new Date(2026, 8, 23, 0, 1));
  assert.deepEqual(result, { taken: 0, skipped: 0, missed: 0, percent: null, streak: 0 });
  const yesterday = adherence(MED, doses, '2026-09-22', 1, new Date(2026, 8, 23, 0, 1));
  assert.equal(yesterday.taken, 1);
  assert.equal(yesterday.missed, 1); // 08:00 on the 22nd was never logged
});

test('adherence counts only resolved slots', () => {
  const doses = indexDoses([dose('2026-09-22', '08:00'), dose('2026-09-22', '20:00'), dose('2026-09-23', '08:00')]);
  // 10:00 on the 23rd: 20:00 is still upcoming and must not count as missed.
  const result = adherence(MED, doses, '2026-09-23', 2, new Date(2026, 8, 23, 10, 0));
  assert.deepEqual(result, { taken: 3, skipped: 0, missed: 0, percent: 100, streak: 2 });
});

test('a skipped or missed dose breaks the streak and the percentage', () => {
  const doses = indexDoses([
    dose('2026-09-21', '08:00'),
    dose('2026-09-21', '20:00'),
    dose('2026-09-22', '08:00', 'skipped'),
    dose('2026-09-22', '20:00'),
    dose('2026-09-23', '08:00'),
    dose('2026-09-23', '20:00'),
  ]);
  const result = adherence(MED, doses, '2026-09-23', 3, new Date(2026, 8, 23, 23, 0));
  assert.equal(result.streak, 1);
  assert.equal(result.skipped, 1);
  assert.equal(result.percent, 83);
});

test('days the medicine is not scheduled neither count nor break a streak', () => {
  const weekdays: Schedulable = { ...MED, times: ['08:00'], days_of_week: [1, 2, 3, 4, 5] };
  // Fri 18 and Mon 21 September 2026 taken; the weekend between has no slots.
  const doses = indexDoses([dose('2026-09-18', '08:00'), dose('2026-09-21', '08:00')]);
  const result = adherence(weekdays, doses, '2026-09-21', 4, new Date(2026, 8, 21, 12, 0));
  assert.deepEqual(result, { taken: 2, skipped: 0, missed: 0, percent: 100, streak: 2 });
});

test('nothing before the start date is ever missed', () => {
  const fresh: Schedulable = { ...MED, start_date: '2026-09-23' };
  const result = adherence(fresh, new Map(), '2026-09-23', 30, new Date(2026, 8, 23, 7, 0));
  assert.equal(result.missed, 0);
  assert.equal(result.percent, null);
});
