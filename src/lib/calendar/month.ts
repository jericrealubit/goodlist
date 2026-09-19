/**
 * The shape of a month, as a grid.
 *
 * Always six rows of seven, even when the month fits in five: a grid whose
 * height changes as you page makes everything below it jump, which reads as a
 * bug rather than as a shorter month.
 *
 * Pure, like `day.ts` — no React, no Expo, no `@/` aliases.
 */
import { addDays, startOfLocalDay, toDayKey, type DayKey } from './day.ts';

/** 0 = weeks start on Sunday (matches `Date.getDay()`), 1 = Monday. */
export type WeekStart = 0 | 1;

export type MonthCell = {
  /** Local midnight on this day. */
  date: Date;
  key: DayKey;
  /** False for the spill from the neighbouring months. */
  inMonth: boolean;
};

export type MonthGrid = {
  /** Local midnight on the 1st — the identity of the month being shown. */
  anchor: Date;
  /** Always CELL_COUNT cells, in reading order. */
  cells: MonthCell[];
  /** Short weekday names from the device locale, already rotated for `weekStart`. */
  weekdayLabels: string[];
};

const COLUMNS = 7;
const ROWS = 6;

/** Six weeks always fits a month, whichever day it starts on. */
export const CELL_COUNT = COLUMNS * ROWS;

function weekdayLabels(weekStart: WeekStart): string[] {
  // Any known week does; walk back from a fixed date to whatever Sunday
  // precedes it rather than hardcoding one and hoping.
  const reference = new Date(2026, 0, 1);
  const sunday = addDays(reference, -reference.getDay());

  const labels: string[] = [];
  for (let i = 0; i < COLUMNS; i += 1) {
    const day = addDays(sunday, (weekStart + i) % COLUMNS);
    labels.push(day.toLocaleDateString(undefined, { weekday: 'short' }));
  }
  return labels;
}

export function buildMonthGrid(anchor: Date, weekStart: WeekStart): MonthGrid {
  const first = startOfLocalDay(new Date(anchor.getFullYear(), anchor.getMonth(), 1));
  const month = first.getMonth();

  // How far back the grid has to start so the 1st lands in its own column.
  const lead = (first.getDay() - weekStart + COLUMNS) % COLUMNS;
  const start = addDays(first, -lead);

  const cells: MonthCell[] = [];
  for (let i = 0; i < CELL_COUNT; i += 1) {
    // startOfLocalDay after the shift, because a day that begins at 01:00 on a
    // spring-forward date would otherwise carry that hour through the grid.
    const date = startOfLocalDay(addDays(start, i));
    cells.push({ date, key: toDayKey(date), inMonth: date.getMonth() === month });
  }

  return { anchor: first, cells, weekdayLabels: weekdayLabels(weekStart) };
}

/** "September 2026", in the device's locale. */
export function monthLabel(anchor: Date): string {
  return anchor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}
