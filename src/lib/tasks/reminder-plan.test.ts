import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  diffTaskReminders,
  isAlarmable,
  planTaskReminders,
  TASK_REMINDER_LIMIT,
  taskReminderIdentifier,
  type RemindableTask,
} from './reminder-plan.ts';

const ME = 'user-me';
const NOW = new Date('2026-09-26T10:00:00Z');

function task(overrides: Partial<RemindableTask> = {}): RemindableTask {
  return {
    id: 't1',
    title: 'Call the vet',
    notes: null,
    due_at: '2026-09-26T17:00:00Z',
    alarm_enabled: true,
    status: 'open',
    assignee_id: ME,
    ...overrides,
  };
}

test('an open, alarmed, future task assigned to me is alarmable', () => {
  assert.equal(isAlarmable(task(), ME, NOW), true);
});

test('alarm off, done, someone else’s, undated or past tasks are not', () => {
  assert.equal(isAlarmable(task({ alarm_enabled: false }), ME, NOW), false);
  assert.equal(isAlarmable(task({ status: 'completed' }), ME, NOW), false);
  assert.equal(isAlarmable(task({ status: 'cancelled' }), ME, NOW), false);
  assert.equal(isAlarmable(task({ assignee_id: 'someone-else' }), ME, NOW), false);
  assert.equal(isAlarmable(task({ due_at: null }), ME, NOW), false);
  assert.equal(isAlarmable(task({ due_at: '2026-09-26T09:59:00Z' }), ME, NOW), false);
});

test('a planned alarm fires at due_at, falling back to "Due now." with no note', () => {
  const { requests, overflow } = planTaskReminders([task()], ME, NOW);
  assert.equal(overflow, 0);
  assert.equal(requests.length, 1);
  const [r] = requests;
  assert.equal(r.identifier, taskReminderIdentifier('t1'));
  assert.equal(r.date.toISOString(), '2026-09-26T17:00:00.000Z');
  assert.equal(r.title, 'Call the vet');
  assert.equal(r.body, 'Due now.');

  const withNote = planTaskReminders([task({ notes: 'Ask about the booster' })], ME, NOW);
  assert.equal(withNote.requests[0].body, 'Ask about the booster');
});

test('over the limit, the soonest are kept and the rest counted as overflow', () => {
  const extra = 3;
  const tasks = Array.from({ length: TASK_REMINDER_LIMIT + extra }, (_, i) =>
    task({
      id: `t${i}`,
      // Latest first, so the planner has to sort.
      due_at: new Date(NOW.getTime() + (TASK_REMINDER_LIMIT + extra - i) * 60_000).toISOString(),
    }),
  );
  const { requests, overflow } = planTaskReminders(tasks, ME, NOW);
  assert.equal(requests.length, TASK_REMINDER_LIMIT);
  assert.equal(overflow, extra);
  const times = requests.map((r) => r.date.getTime());
  assert.deepEqual(times, [...times].sort((a, b) => a - b));
  assert.equal(requests[0].taskId, `t${TASK_REMINDER_LIMIT + extra - 1}`);
});

test('an unchanged alarm is left alone; a changed one is cancelled and rescheduled', () => {
  const { requests } = planTaskReminders([task()], ME, NOW);
  const [r] = requests;

  const same = diffTaskReminders(requests, [{ identifier: r.identifier, signature: r.signature }]);
  assert.deepEqual(same, { toSchedule: [], toCancel: [] });

  const changed = diffTaskReminders(requests, [{ identifier: r.identifier, signature: 'stale' }]);
  assert.deepEqual(changed.toCancel, [r.identifier]);
  assert.deepEqual(
    changed.toSchedule.map((s) => s.identifier),
    [r.identifier],
  );
});

test('an alarm no longer wanted is cancelled, and other modules’ notifications are ignored', () => {
  const { toSchedule, toCancel } = diffTaskReminders(
    [],
    [
      { identifier: taskReminderIdentifier('gone'), signature: 'x' },
      { identifier: 'med:m1:*:08:00', signature: 'y' },
      { identifier: 'alarm:task:t1', signature: null },
    ],
  );
  assert.deepEqual(toSchedule, []);
  assert.deepEqual(toCancel, [taskReminderIdentifier('gone')]);
});
