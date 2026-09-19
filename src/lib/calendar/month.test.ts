import assert from 'node:assert/strict';
import { test } from 'node:test';

import { addDays, toDayKey } from './day.ts';
import { CELL_COUNT, buildMonthGrid, monthLabel } from './month.ts';

test('a month is always six rows of seven, however it falls', () => {
  // A short February, a 31-day month, and one starting on a Sunday all agree.
  assert.equal(buildMonthGrid(new Date(2026, 1, 1), 0).cells.length, CELL_COUNT);
  assert.equal(buildMonthGrid(new Date(2026, 2, 1), 0).cells.length, CELL_COUNT);
  assert.equal(buildMonthGrid(new Date(2026, 10, 1), 0).cells.length, CELL_COUNT);
  assert.equal(CELL_COUNT, 42);
});

test('the grid starts on the chosen first day of the week', () => {
  assert.equal(buildMonthGrid(new Date(2026, 8, 1), 0).cells[0].date.getDay(), 0);
  assert.equal(buildMonthGrid(new Date(2026, 8, 1), 1).cells[0].date.getDay(), 1);
});

test('the anchor is normalised to the first of the month', () => {
  const grid = buildMonthGrid(new Date(2026, 8, 19, 14, 30), 0);
  assert.equal(grid.anchor.getDate(), 1);
  assert.equal(grid.anchor.getMonth(), 8);
  assert.equal(grid.anchor.getHours(), 0);
});

test('cells run consecutively, with no gap or repeat', () => {
  // March 2026 contains the US spring-forward. Adding 86_400_000 milliseconds
  // instead of a calendar day is exactly what this catches.
  const { cells } = buildMonthGrid(new Date(2026, 2, 1), 0);
  for (let i = 1; i < cells.length; i += 1) {
    assert.equal(
      cells[i].key,
      toDayKey(addDays(cells[i - 1].date, 1)),
      `cell ${i} does not follow cell ${i - 1}`,
    );
  }
  assert.equal(new Set(cells.map((c) => c.key)).size, CELL_COUNT);
});

test('every cell begins at local midnight', () => {
  for (const cell of buildMonthGrid(new Date(2026, 2, 1), 0).cells) {
    assert.equal(cell.date.getHours(), 0, `${cell.key} does not start at midnight`);
  }
});

test('inMonth marks the spill from either side', () => {
  // September 2026 starts on a Tuesday, so a Sunday-start grid leads with
  // two days of August.
  const { cells } = buildMonthGrid(new Date(2026, 8, 1), 0);
  assert.equal(cells[0].key, '2026-08-30');
  assert.equal(cells[0].inMonth, false);
  assert.equal(cells[2].key, '2026-09-01');
  assert.equal(cells[2].inMonth, true);

  const inMonth = cells.filter((c) => c.inMonth);
  assert.equal(inMonth.length, 30);
  assert.equal(inMonth[0].key, '2026-09-01');
  assert.equal(inMonth[inMonth.length - 1].key, '2026-09-30');
});

test('a leap February carries its 29th', () => {
  const inMonth = buildMonthGrid(new Date(2028, 1, 1), 0).cells.filter((c) => c.inMonth);
  assert.equal(inMonth.length, 29);
  assert.equal(inMonth[inMonth.length - 1].key, '2028-02-29');
});

test('a non-leap February stops at the 28th', () => {
  const inMonth = buildMonthGrid(new Date(2026, 1, 1), 0).cells.filter((c) => c.inMonth);
  assert.equal(inMonth.length, 28);
  assert.equal(inMonth[inMonth.length - 1].key, '2026-02-28');
});

test('there are seven weekday labels, rotated by the week start', () => {
  const sundayFirst = buildMonthGrid(new Date(2026, 8, 1), 0).weekdayLabels;
  const mondayFirst = buildMonthGrid(new Date(2026, 8, 1), 1).weekdayLabels;
  assert.equal(sundayFirst.length, 7);
  assert.equal(mondayFirst.length, 7);
  // Same names, different starting point.
  assert.equal(mondayFirst[0], sundayFirst[1]);
  assert.equal(mondayFirst[6], sundayFirst[0]);
});

test('the month label names the month and year', () => {
  const label = monthLabel(new Date(2026, 8, 1));
  assert.ok(label.includes('2026'), `expected a year in ${label}`);
  assert.ok(label.length > 4, `expected a month name in ${label}`);
});
