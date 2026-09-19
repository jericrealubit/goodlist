import assert from 'node:assert/strict';
import { test } from 'node:test';

// Imports inside this folder carry their `.ts` extension because Node loads
// these modules itself when the tests run, and its resolver — unlike Metro's —
// does not guess at extensions.
import {
  DUE_HOUR,
  addDays,
  addMonths,
  fromDayKey,
  isOverdue,
  isSameLocalDay,
  startOfLocalDay,
  toDayKey,
  withDueTime,
} from './day.ts';

/** Every expectation is built from local constructors, so the suite passes in any TZ. */

test('a day key is the local date, not a slice of the ISO string', () => {
  // The regression this module exists to prevent: the web picker stores local
  // midnight, which east of UTC serialises as the *previous* day at 16:00Z.
  // Round-tripping through toISOString() must not move the day.
  const localMidnight = new Date(2026, 8, 19, 0, 0, 0, 0);
  const roundTripped = new Date(localMidnight.toISOString());
  assert.equal(toDayKey(roundTripped), '2026-09-19');
  assert.equal(toDayKey(localMidnight), '2026-09-19');
});

test('every instant on one local day shares a key', () => {
  assert.equal(toDayKey(new Date(2026, 8, 19, 0, 0, 0, 0)), '2026-09-19');
  assert.equal(toDayKey(new Date(2026, 8, 19, 23, 59, 59, 999)), '2026-09-19');
  assert.equal(toDayKey(new Date(2026, 8, 19, 9, 0)), '2026-09-19');
});

test('single-digit months and days are padded', () => {
  assert.equal(toDayKey(new Date(2026, 0, 5)), '2026-01-05');
});

test('a key round-trips to local midnight on that day', () => {
  const date = fromDayKey('2026-09-19');
  assert.notEqual(date, null);
  assert.equal(date?.getFullYear(), 2026);
  assert.equal(date?.getMonth(), 8);
  assert.equal(date?.getDate(), 19);
  assert.equal(date?.getHours(), 0);
});

test('a malformed or impossible key is null, never an Invalid Date', () => {
  assert.equal(fromDayKey(''), null);
  assert.equal(fromDayKey('nonsense'), null);
  assert.equal(fromDayKey('2026-9-19'), null);
  assert.equal(fromDayKey('2026-13-01'), null);
  // February has no 31st — this must not silently roll into March.
  assert.equal(fromDayKey('2026-02-31'), null);
});

test('adding months clamps instead of overflowing', () => {
  // The bug this function exists to avoid: setMonth alone makes this 3 March.
  assert.equal(toDayKey(addMonths(new Date(2026, 0, 31), 1)), '2026-02-28');
  // And it must find the 29th in a leap year.
  assert.equal(toDayKey(addMonths(new Date(2028, 0, 31), 1)), '2028-02-29');
  // An ordinary month is untouched.
  assert.equal(toDayKey(addMonths(new Date(2026, 8, 19), 1)), '2026-10-19');
});

test('adding months crosses a year boundary in both directions', () => {
  assert.equal(toDayKey(addMonths(new Date(2026, 11, 15), 1)), '2027-01-15');
  assert.equal(toDayKey(addMonths(new Date(2026, 0, 15), -1)), '2025-12-15');
  assert.equal(toDayKey(addMonths(new Date(2026, 0, 15), -13)), '2024-12-15');
});

test('adding months keeps the time of day', () => {
  const moved = addMonths(new Date(2026, 8, 19, 14, 30), 1);
  assert.equal(moved.getHours(), 14);
  assert.equal(moved.getMinutes(), 30);
});

test('adding days is calendar arithmetic, across months and years', () => {
  assert.equal(toDayKey(addDays(new Date(2026, 8, 30), 1)), '2026-10-01');
  assert.equal(toDayKey(addDays(new Date(2026, 11, 31), 1)), '2027-01-01');
  assert.equal(toDayKey(addDays(new Date(2026, 0, 1), -1)), '2025-12-31');
});

test('overdue is decided by the day, never the hour', () => {
  const lateToday = new Date(2026, 8, 19, 23, 0);
  const dueTodayAtMidnight = new Date(2026, 8, 19, 0, 0);
  // The whole point: a task stored at local midnight is not late at 11pm.
  assert.equal(isOverdue(dueTodayAtMidnight, lateToday), false);

  const justAfterMidnight = new Date(2026, 8, 19, 0, 1);
  const dueYesterdayLate = new Date(2026, 8, 18, 23, 59);
  assert.equal(isOverdue(dueYesterdayLate, justAfterMidnight), true);

  // Tomorrow is never overdue.
  assert.equal(isOverdue(new Date(2026, 8, 20, 9, 0), lateToday), false);
});

test('a scheduled day always lands on the same hour', () => {
  const scheduled = withDueTime(new Date(2026, 8, 19, 17, 43, 12, 500));
  assert.equal(scheduled.getHours(), DUE_HOUR);
  assert.equal(scheduled.getMinutes(), 0);
  assert.equal(scheduled.getSeconds(), 0);
  assert.equal(scheduled.getMilliseconds(), 0);
  assert.equal(toDayKey(scheduled), '2026-09-19');
});

test('start of day zeroes the clock without moving the day', () => {
  const start = startOfLocalDay(new Date(2026, 8, 19, 23, 59));
  assert.equal(start.getHours(), 0);
  assert.equal(toDayKey(start), '2026-09-19');
});

test('same-day comparison ignores the time', () => {
  assert.equal(isSameLocalDay(new Date(2026, 8, 19, 0, 0), new Date(2026, 8, 19, 23, 59)), true);
  assert.equal(isSameLocalDay(new Date(2026, 8, 19, 23, 59), new Date(2026, 8, 20, 0, 0)), false);
});
