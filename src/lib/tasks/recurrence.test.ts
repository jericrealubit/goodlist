import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  describeRecurrence,
  landsOn,
  occurrenceDates,
  visibleInTaskList,
  type RecurrencePattern,
} from './recurrence.ts';

function series(overrides: Partial<RecurrencePattern> = {}): RecurrencePattern {
  return {
    frequency: 'daily',
    days_of_week: null,
    start_date: '2026-09-21', // a Monday
    end_date: null,
    skipped_dates: [],
    active: true,
    ...overrides,
  };
}

test('daily lands on every day from the start, and never before it', () => {
  const daily = series();
  assert.equal(landsOn(daily, '2026-09-20'), false);
  assert.equal(landsOn(daily, '2026-09-21'), true);
  assert.equal(landsOn(daily, '2026-09-22'), true);
});

test('weekly and fortnightly count from the start date', () => {
  const weekly = series({ frequency: 'weekly' });
  assert.deepEqual(occurrenceDates(weekly, '2026-09-21', { max: 3 }), ['2026-09-21', '2026-09-28', '2026-10-05']);

  const fortnightly = series({ frequency: 'fortnightly' });
  assert.deepEqual(occurrenceDates(fortnightly, '2026-09-21', { max: 3 }), [
    '2026-09-21',
    '2026-10-05',
    '2026-10-19',
  ]);
  // Asked from mid-cycle, the next one is still on the series' own rhythm.
  assert.deepEqual(occurrenceDates(fortnightly, '2026-09-24', { max: 1 }), ['2026-10-05']);
});

test('custom lands only on the chosen weekdays', () => {
  const monWedFri = series({ frequency: 'custom', days_of_week: [1, 3, 5] });
  assert.deepEqual(occurrenceDates(monWedFri, '2026-09-21', { max: 5 }), [
    '2026-09-21',
    '2026-09-23',
    '2026-09-25',
    '2026-09-28',
    '2026-09-30',
  ]);
});

test('monthly keeps the day of the month, clamped for short months', () => {
  const monthly31 = series({ frequency: 'monthly', start_date: '2026-01-31' });
  assert.deepEqual(occurrenceDates(monthly31, '2026-01-31', { days: 120, max: 4 }), [
    '2026-01-31',
    '2026-02-28',
    '2026-03-31',
    '2026-04-30',
  ]);
});

test('the window stops at whichever comes first: 90 days or 12 occurrences', () => {
  assert.equal(occurrenceDates(series(), '2026-09-21').length, 12);
  // Monthly only fits three occurrences into 90 days.
  assert.equal(occurrenceDates(series({ frequency: 'monthly' }), '2026-09-21').length, 3);
});

test('the window starts today — it never back-fills days that already went by', () => {
  assert.deepEqual(occurrenceDates(series(), '2026-10-01', { max: 2 }), ['2026-10-01', '2026-10-02']);
});

test('an end date, skipped dates and a stopped series all hold back occurrences', () => {
  assert.deepEqual(occurrenceDates(series({ end_date: '2026-09-23' }), '2026-09-21'), [
    '2026-09-21',
    '2026-09-22',
    '2026-09-23',
  ]);
  assert.deepEqual(occurrenceDates(series({ skipped_dates: ['2026-09-22'] }), '2026-09-21', { max: 2 }), [
    '2026-09-21',
    '2026-09-23',
  ]);
  assert.deepEqual(occurrenceDates(series({ active: false }), '2026-09-21'), []);
});

test('a series that starts later begins on its start date, not today', () => {
  assert.deepEqual(occurrenceDates(series({ start_date: '2026-09-25' }), '2026-09-21', { max: 1 }), ['2026-09-25']);
});

test('weekly counting is not thrown off by a daylight-saving change', () => {
  // Europe and the US both change clocks in late October/early November;
  // counting calendar days (not milliseconds) keeps every Monday a Monday.
  const weekly = series({ frequency: 'weekly' });
  const dates = occurrenceDates(weekly, '2026-09-21', { max: 8 });
  assert.equal(dates[6], '2026-11-02');
  assert.equal(dates[7], '2026-11-09');
});

test('the task list shows arrived occurrences, and otherwise only the next one', () => {
  const tasks = [
    { id: 'a', recurrence_id: null, occurrence_date: null },
    { id: 'yesterday', recurrence_id: 's1', occurrence_date: '2026-09-20' },
    { id: 'today', recurrence_id: 's1', occurrence_date: '2026-09-21' },
    { id: 'tomorrow', recurrence_id: 's1', occurrence_date: '2026-09-22' },
    { id: 'next-week', recurrence_id: 's2', occurrence_date: '2026-09-28' },
    { id: 'week-after', recurrence_id: 's2', occurrence_date: '2026-10-05' },
  ];
  assert.deepEqual(
    visibleInTaskList(tasks, '2026-09-21').map((t) => t.id),
    ['a', 'yesterday', 'today', 'next-week'],
  );
});

test('describeRecurrence reads the way a person would say it', () => {
  assert.equal(describeRecurrence(series()), 'Every day');
  assert.equal(describeRecurrence(series({ frequency: 'weekly' })), 'Every week on Monday');
  assert.equal(describeRecurrence(series({ frequency: 'fortnightly' })), 'Every 2 weeks on Monday');
  assert.equal(describeRecurrence(series({ frequency: 'monthly', start_date: '2026-09-01' })), 'Every month on the 1st');
  assert.equal(describeRecurrence(series({ frequency: 'monthly', start_date: '2026-09-12' })), 'Every month on the 12th');
  assert.equal(describeRecurrence(series({ frequency: 'custom', days_of_week: [5, 1, 3] })), 'Every Mon, Wed and Fri');
  assert.equal(describeRecurrence(series({ frequency: 'custom', days_of_week: [0] })), 'Every Sun');
});
