import assert from 'node:assert/strict';
import { test } from 'node:test';

import { toDayKey } from '../calendar/day.ts';
import {
  daysEndingOn,
  isScheduledOn,
  normalizeTimes,
  parseTime,
  slotsForDay,
  slotsForDayAll,
  type Schedulable,
} from './schedule.ts';

function med(overrides: Partial<Schedulable> = {}): Schedulable {
  return {
    id: 'm1',
    times: ['08:00'],
    days_of_week: null,
    start_date: '2026-09-01',
    end_date: null,
    archived_at: null,
    ...overrides,
  };
}

test('parseTime accepts only 24-hour HH:MM', () => {
  assert.deepEqual(parseTime('08:30'), { hour: 8, minute: 30 });
  assert.deepEqual(parseTime('23:59'), { hour: 23, minute: 59 });
  assert.equal(parseTime('24:00'), null);
  assert.equal(parseTime('8:30'), null);
  assert.equal(parseTime('08:60'), null);
});

test('normalizeTimes drops junk and duplicates and sorts the day', () => {
  assert.deepEqual(normalizeTimes(['20:00', '08:00', 'nope', '08:00']), ['08:00', '20:00']);
});

test('a course runs from its start day through its end day inclusive', () => {
  const course = med({ start_date: '2026-09-10', end_date: '2026-09-12' });
  assert.equal(isScheduledOn(course, '2026-09-09'), false);
  assert.equal(isScheduledOn(course, '2026-09-10'), true);
  assert.equal(isScheduledOn(course, '2026-09-12'), true);
  assert.equal(isScheduledOn(course, '2026-09-13'), false);
});

test('weekday filtering reads the local day of week', () => {
  // 23 September 2026 is a Wednesday (3).
  const mwf = med({ days_of_week: [1, 3, 5] });
  assert.equal(isScheduledOn(mwf, '2026-09-23'), true);
  assert.equal(isScheduledOn(mwf, '2026-09-24'), false);
});

test('an archived medication schedules nothing', () => {
  assert.deepEqual(slotsForDay(med({ archived_at: '2026-09-20T00:00:00Z' }), '2026-09-23'), []);
});

test('slots are local wall-clock moments on that day', () => {
  const [morning, evening] = slotsForDay(med({ times: ['20:00', '08:00'] }), '2026-09-23');
  assert.equal(morning.time, '08:00');
  assert.equal(morning.at.getHours(), 8);
  assert.equal(toDayKey(morning.at), '2026-09-23');
  assert.equal(evening.at.getHours(), 20);
});

test('slotsForDayAll interleaves medications by time', () => {
  const a = med({ id: 'a', times: ['09:00'] });
  const b = med({ id: 'b', times: ['07:00', '21:00'] });
  assert.deepEqual(
    slotsForDayAll([a, b], '2026-09-23').map((s) => `${s.medicationId}@${s.time}`),
    ['b@07:00', 'a@09:00', 'b@21:00'],
  );
});

test('daysEndingOn steps by calendar day across a month end', () => {
  assert.deepEqual(daysEndingOn('2026-10-02', 4), ['2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02']);
});

test('daysEndingOn neither skips nor repeats a day across either DST change', () => {
  // March/April and October/November cover the northern and southern
  // hemisphere transitions, whichever TZ this runs in.
  for (const last of ['2026-04-10', '2026-11-05']) {
    const days = daysEndingOn(last, 40);
    assert.equal(new Set(days).size, 40);
    assert.equal(days[39], last);
  }
});
