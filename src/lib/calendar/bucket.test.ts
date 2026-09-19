import assert from 'node:assert/strict';
import { test } from 'node:test';

import { bucketByDay, type Schedulable } from './bucket.ts';

/** Friday, 19 September 2026, 10:00 local. */
const NOW = new Date(2026, 8, 19, 10, 0, 0, 0);

function task(id: string, due: Date | null, sortOrder = 0): Schedulable {
  return { id, due_at: due ? due.toISOString() : null, sort_order: sortOrder };
}

test('a task with no due date is unscheduled and on no day', () => {
  const { byDay, unscheduled, overdue } = bucketByDay([task('a', null)], NOW);
  assert.deepEqual(
    unscheduled.map((t) => t.id),
    ['a'],
  );
  assert.equal(byDay.size, 0);
  assert.deepEqual(overdue, []);
});

test('tasks land on their local day whatever hour is stored', () => {
  // The three writers in the app store local midnight, an arbitrary hour, and
  // 09:00. All three are the same day and must share a bucket.
  const tasks = [
    task('midnight', new Date(2026, 8, 19, 0, 0)),
    task('morning', new Date(2026, 8, 19, 9, 0)),
    task('late', new Date(2026, 8, 19, 23, 59)),
  ];
  const { byDay } = bucketByDay(tasks, NOW);
  assert.equal(byDay.size, 1);
  assert.deepEqual(
    byDay.get('2026-09-19')?.map((t) => t.id),
    ['midnight', 'morning', 'late'],
  );
});

test('a day is ordered by time, with sort_order only breaking ties', () => {
  const tasks = [
    task('afternoon', new Date(2026, 8, 19, 14, 0), -10),
    task('early-b', new Date(2026, 8, 19, 9, 0), -5),
    task('early-a', new Date(2026, 8, 19, 9, 0), -20),
  ];
  const { byDay } = bucketByDay(tasks, NOW);
  assert.deepEqual(
    byDay.get('2026-09-19')?.map((t) => t.id),
    ['early-a', 'early-b', 'afternoon'],
  );
});

test('overdue is yesterday and earlier, never today', () => {
  const tasks = [
    task('yesterday', new Date(2026, 8, 18, 23, 59)),
    task('today-midnight', new Date(2026, 8, 19, 0, 0)),
    task('tomorrow', new Date(2026, 8, 20, 9, 0)),
    task('last-month', new Date(2026, 7, 1, 9, 0)),
  ];
  const { overdue } = bucketByDay(tasks, NOW);
  // Oldest first, and today's midnight task is not late at 10am.
  assert.deepEqual(
    overdue.map((t) => t.id),
    ['last-month', 'yesterday'],
  );
});

test('an overdue task is still on its own day', () => {
  const { byDay, overdue } = bucketByDay([task('a', new Date(2026, 8, 18, 9, 0))], NOW);
  assert.deepEqual(
    byDay.get('2026-09-18')?.map((t) => t.id),
    ['a'],
  );
  assert.equal(overdue.length, 1);
});

test('an unparseable due date is shown as undated rather than dropped', () => {
  const broken: Schedulable = { id: 'a', due_at: 'not-a-date', sort_order: 0 };
  const { byDay, unscheduled } = bucketByDay([broken], NOW);
  assert.deepEqual(
    unscheduled.map((t) => t.id),
    ['a'],
  );
  assert.equal(byDay.size, 0);
});

test('separate calls do not share state', () => {
  const tasks = [task('a', new Date(2026, 8, 19, 9, 0))];
  const first = bucketByDay(tasks, NOW);
  const second = bucketByDay(tasks, NOW);
  first.byDay.get('2026-09-19')?.push(task('injected', new Date(2026, 8, 19, 9, 0)));
  assert.equal(second.byDay.get('2026-09-19')?.length, 1);
});

test('an empty list gives empty buckets', () => {
  const { byDay, unscheduled, overdue } = bucketByDay([], NOW);
  assert.equal(byDay.size, 0);
  assert.deepEqual(unscheduled, []);
  assert.deepEqual(overdue, []);
});
