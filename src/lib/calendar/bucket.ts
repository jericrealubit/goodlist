/**
 * Sorts tasks onto the days they are due.
 *
 * Structurally typed rather than importing `Task`, so the tests can pass plain
 * objects and this module can stay free of `@/` aliases — the condition for
 * `node --test` running it directly.
 */
import { isOverdue, toDayKey, type DayKey } from './day.ts';

/** The parts of a task this module needs. `Task` satisfies it. */
export type Schedulable = {
  id: string;
  due_at: string | null;
  sort_order: number;
};

export type DayBuckets<T> = {
  byDay: Map<DayKey, T[]>;
  /** No due date at all — the overwhelming majority, since the compose bar never sets one. */
  unscheduled: T[];
  /** Dated before today. Drives the overdue line and the red dot. */
  overdue: T[];
};

/**
 * Due instant first, so a 09:00 task precedes a 14:00 one. `sort_order` only
 * breaks a tie: it is negative epoch seconds carrying the manual drag order,
 * which is orthogonal to dates and must never drive the day's ordering.
 */
function byDueThenOrder(a: Schedulable, b: Schedulable): number {
  const aDue = a.due_at ? new Date(a.due_at).getTime() : 0;
  const bDue = b.due_at ? new Date(b.due_at).getTime() : 0;
  if (aDue !== bDue) return aDue - bDue;
  return a.sort_order - b.sort_order;
}

export function bucketByDay<T extends Schedulable>(tasks: T[], now: Date): DayBuckets<T> {
  const byDay = new Map<DayKey, T[]>();
  const unscheduled: T[] = [];
  const overdue: T[] = [];

  for (const task of tasks) {
    if (!task.due_at) {
      unscheduled.push(task);
      continue;
    }

    const due = new Date(task.due_at);
    // A due date the server somehow can't parse is better shown as undated than
    // dropped from the calendar entirely.
    if (Number.isNaN(due.getTime())) {
      unscheduled.push(task);
      continue;
    }

    const key = toDayKey(due);
    const day = byDay.get(key);
    if (day) day.push(task);
    else byDay.set(key, [task]);

    if (isOverdue(due, now)) overdue.push(task);
  }

  for (const day of byDay.values()) day.sort(byDueThenOrder);
  overdue.sort(byDueThenOrder);

  return { byDay, unscheduled, overdue };
}
