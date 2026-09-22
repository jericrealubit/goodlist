import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  diffReminders,
  planReminders,
  REMINDER_LIMIT,
  reminderIdentifier,
  type RemindableMedication,
} from './reminder-plan.ts';

const TODAY = '2026-09-23';

function med(overrides: Partial<RemindableMedication> = {}): RemindableMedication {
  return {
    id: 'm1',
    name: 'Metformin',
    dose: '500 mg',
    times: ['08:00', '20:00'],
    days_of_week: null,
    start_date: '2026-09-01',
    end_date: null,
    archived_at: null,
    reminders_enabled: true,
    ...overrides,
  };
}

test('an every-day medicine gets one daily reminder per time', () => {
  const { requests, overflow } = planReminders([med()], TODAY);
  assert.equal(overflow, 0);
  assert.deepEqual(
    requests.map((r) => [r.identifier, r.hour, r.minute, r.weekday]),
    [
      ['med:m1:*:08:00', 8, 0, null],
      ['med:m1:*:20:00', 20, 0, null],
    ],
  );
});

test('specific weekdays become weekly reminders numbered 1 = Sunday', () => {
  const { requests } = planReminders([med({ times: ['09:30'], days_of_week: [0, 3] })], TODAY);
  assert.deepEqual(
    requests.map((r) => r.weekday),
    [1, 4],
  );
});

test('disabled, archived, ended and not-yet-started medicines get none', () => {
  const meds = [
    med({ id: 'off', reminders_enabled: false }),
    med({ id: 'archived', archived_at: '2026-09-20T00:00:00Z' }),
    med({ id: 'ended', end_date: '2026-09-22' }),
    med({ id: 'future', start_date: '2026-09-24' }),
    med({ id: 'last-day', end_date: TODAY }),
  ];
  const ids = new Set(planReminders(meds, TODAY).requests.map((r) => r.medicationId));
  assert.deepEqual([...ids], ['last-day']);
});

test('the plan never exceeds the iOS pending limit, and keeps daily ones first', () => {
  const weekly = Array.from({ length: 10 }, (_, i) =>
    med({ id: `w${i}`, times: ['08:00'], days_of_week: [0, 1, 2, 3, 4, 5, 6] }),
  );
  const daily = med({ id: 'daily', times: ['07:00'] });
  const { requests, overflow } = planReminders([...weekly, daily], TODAY);
  assert.equal(requests.length, REMINDER_LIMIT);
  assert.equal(overflow, 71 - REMINDER_LIMIT);
  assert.equal(requests[0].medicationId, 'daily');
});

test('diff schedules what is missing and cancels what is stale', () => {
  const { requests } = planReminders([med()], TODAY);
  const existing = [
    { identifier: requests[0].identifier, signature: requests[0].signature },
    { identifier: reminderIdentifier('gone', null, '10:00'), signature: 'x' },
    { identifier: 'snooze:abc', signature: null },
  ];
  const { toSchedule, toCancel } = diffReminders(requests, existing);
  assert.deepEqual(
    toSchedule.map((r) => r.identifier),
    [requests[1].identifier],
  );
  // Snoozes aren't this module's to touch.
  assert.deepEqual(toCancel, ['med:gone:*:10:00']);
});

test('a rename reschedules exactly the reminders it changed', () => {
  const before = planReminders([med()], TODAY).requests;
  const after = planReminders([med({ name: 'Metformin XR' })], TODAY).requests;
  const existing = before.map((r) => ({ identifier: r.identifier, signature: r.signature }));
  const { toSchedule, toCancel } = diffReminders(after, existing);
  assert.equal(toSchedule.length, 2);
  assert.deepEqual(toCancel.sort(), before.map((r) => r.identifier).sort());
});

test('an unchanged plan is a no-op', () => {
  const { requests } = planReminders([med()], TODAY);
  const existing = requests.map((r) => ({ identifier: r.identifier, signature: r.signature }));
  assert.deepEqual(diffReminders(requests, existing), { toSchedule: [], toCancel: [] });
});
