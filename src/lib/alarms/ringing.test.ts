import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  diffFollowUps,
  doseAlarmDays,
  doseAlarmKey,
  doseAlarms,
  FOLLOW_UP_LIMIT,
  FOLLOW_UP_OFFSETS_SEC,
  followUpIdentifier,
  isRinging,
  planFollowUps,
  pruneMarks,
  ringingAlarms,
  RINGING_WINDOW_MS,
  taskAlarmKey,
  taskAlarms,
  type Alarm,
  type AlarmableMedication,
  type AlarmableTask,
} from './ringing.ts';

const ME = 'u1';
const MINUTE = 60_000;

function task(overrides: Partial<AlarmableTask> = {}): AlarmableTask {
  return {
    id: 't1',
    title: 'Pay rent',
    notes: null,
    due_at: '2026-09-24T09:00:00.000Z',
    alarm_enabled: true,
    status: 'open',
    assignee_id: ME,
    updated_at: '2026-09-23T09:00:00.000Z',
    ...overrides,
  };
}

function med(overrides: Partial<AlarmableMedication> = {}): AlarmableMedication {
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
    updated_at: '2026-09-01T00:00:00.000Z',
    ...overrides,
  };
}

function alarm(overrides: Partial<Alarm> = {}): Alarm {
  return {
    key: 'task:t1@0',
    at: new Date('2026-09-24T09:00:00.000Z'),
    title: 'Pay rent',
    body: 'Due now.',
    source: { kind: 'task', taskId: 't1' },
    ...overrides,
  };
}

test('task alarm keys are the same however the instant is spelled', () => {
  assert.equal(taskAlarmKey('t1', '2026-09-24T09:00:00+00:00'), taskAlarmKey('t1', '2026-09-24T09:00:00.000Z'));
});

test('an open, alarmed task assigned to me is an alarm, even once it is past due', () => {
  const [a] = taskAlarms([task()], ME);
  assert.equal(a.key, taskAlarmKey('t1', '2026-09-24T09:00:00.000Z'));
  assert.deepEqual(a.source, { kind: 'task', taskId: 't1' });
});

test('tasks that should not ring are left out', () => {
  const tasks = [
    task({ id: 'off', alarm_enabled: false }),
    task({ id: 'done', status: 'completed' }),
    task({ id: 'theirs', assignee_id: 'u2' }),
    task({ id: 'undated', due_at: null }),
    // Saved after its due time: it never rang, so it doesn't start now.
    task({ id: 'late', updated_at: '2026-09-24T12:00:00.000Z' }),
  ];
  assert.deepEqual(taskAlarms(tasks, ME), []);
});

test('each unlogged dose slot on the given days is an alarm; logged ones are answered', () => {
  const alarms = doseAlarms([med()], [{ medication_id: 'm1', slot_date: '2026-09-24', slot_time: '08:00' }], [
    '2026-09-24',
  ]);
  assert.deepEqual(
    alarms.map((a) => a.key),
    [doseAlarmKey('m1', '2026-09-24', '20:00')],
  );
  assert.equal(alarms[0].title, 'Time for Metformin');
});

test('medicines with reminders off, or slots before the medicine was saved, do not ring', () => {
  assert.deepEqual(doseAlarms([med({ reminders_enabled: false })], [], ['2026-09-24']), []);
  const savedMidday = new Date(2026, 8, 24, 12, 0).toISOString();
  const alarms = doseAlarms([med({ updated_at: savedMidday })], [], ['2026-09-24']);
  assert.deepEqual(
    alarms.map((a) => a.key),
    [doseAlarmKey('m1', '2026-09-24', '20:00')],
  );
});

test('an alarm rings from its time until stopped, for at most the ringing window', () => {
  const a = alarm();
  const at = a.at.getTime();
  assert.equal(isRinging(a, undefined, new Date(at - MINUTE)), false);
  assert.equal(isRinging(a, undefined, new Date(at)), true);
  assert.equal(isRinging(a, undefined, new Date(at + RINGING_WINDOW_MS - MINUTE)), true);
  assert.equal(isRinging(a, undefined, new Date(at + RINGING_WINDOW_MS)), false);
  assert.equal(isRinging(a, { stopped: true, updatedAt: a.at.toISOString() }, new Date(at + MINUTE)), false);
});

test('a snoozed alarm is quiet until the snooze ends, then rings again', () => {
  const a = alarm();
  const at = a.at.getTime();
  const mark = { snoozedUntil: new Date(at + 10 * MINUTE).toISOString(), updatedAt: a.at.toISOString() };
  assert.equal(isRinging(a, mark, new Date(at + 5 * MINUTE)), false);
  assert.equal(isRinging(a, mark, new Date(at + 10 * MINUTE)), true);
});

test('ringingAlarms lists only what is ringing, earliest first', () => {
  const early = alarm({ key: 'a', at: new Date('2026-09-24T08:00:00.000Z') });
  const late = alarm({ key: 'b', at: new Date('2026-09-24T08:30:00.000Z') });
  const future = alarm({ key: 'c', at: new Date('2026-09-24T10:00:00.000Z') });
  const now = new Date('2026-09-24T09:00:00.000Z');
  assert.deepEqual(
    ringingAlarms([future, late, early], {}, now).map((a) => a.key),
    ['a', 'b'],
  );
});

test('follow-ups ring on the offsets after the alarm, skipping ones already past', () => {
  const a = alarm();
  const now = new Date(a.at.getTime() + 3.5 * MINUTE);
  const requests = planFollowUps([a], {}, now);
  const expected = FOLLOW_UP_OFFSETS_SEC.filter((s) => s > 210);
  assert.deepEqual(
    requests.map((r) => (r.date.getTime() - a.at.getTime()) / 1000),
    expected,
  );
  assert.equal(requests[0].identifier, followUpIdentifier(a.key, FOLLOW_UP_OFFSETS_SEC.indexOf(225)));
});

test('for the first five minutes the rings are closer together than the sound is long', () => {
  const SOUND_SECONDS = 20;
  const early = FOLLOW_UP_OFFSETS_SEC.filter((s) => s <= 300);
  assert.equal(early.length, 12);
  for (let i = 1; i < early.length; i++) assert.ok(early[i] - early[i - 1] < SOUND_SECONDS + 10);
  assert.equal(FOLLOW_UP_OFFSETS_SEC.at(-1), 2 * 60 * 60);
});

test('a stopped alarm has no follow-ups; a snoozed one restarts from the snooze', () => {
  const a = alarm();
  const now = new Date(a.at.getTime() + 2 * MINUTE);
  assert.deepEqual(planFollowUps([a], { [a.key]: { stopped: true, updatedAt: now.toISOString() } }, now), []);

  const until = new Date(now.getTime() + 10 * MINUTE);
  const snoozed = planFollowUps([a], { [a.key]: { snoozedUntil: until.toISOString(), updatedAt: now.toISOString() } }, now);
  assert.equal(snoozed[0].date.getTime(), until.getTime());
  assert.equal(snoozed[1].date.getTime(), until.getTime() + FOLLOW_UP_OFFSETS_SEC[0] * 1000);
});

test('over the cap, the soonest follow-ups across alarms win', () => {
  const alarms = [0, 1, 2].map((i) => alarm({ key: `k${i}`, at: new Date(Date.UTC(2026, 8, 24, 9 + i)) }));
  const requests = planFollowUps(alarms, {}, new Date(Date.UTC(2026, 8, 24, 8)));
  assert.equal(requests.length, FOLLOW_UP_LIMIT);
  for (let i = 1; i < requests.length; i++) assert.ok(requests[i - 1].date <= requests[i].date);
});

test('diffFollowUps only touches changed follow-ups and leaves other notifications alone', () => {
  const a = alarm();
  const desired = planFollowUps([a], {}, new Date(a.at.getTime() - MINUTE)).slice(0, 2);
  const existing = [
    { identifier: desired[0].identifier, signature: desired[0].signature },
    { identifier: 'alarm:gone#0', signature: 'x' },
    { identifier: 'task:t9', signature: 'y' },
  ];
  const { toSchedule, toCancel } = diffFollowUps(desired, existing);
  assert.deepEqual(
    toSchedule.map((r) => r.identifier),
    [desired[1].identifier],
  );
  assert.deepEqual(toCancel, ['alarm:gone#0']);
});

test('dose alarm days are yesterday, today and tomorrow, across a month end', () => {
  assert.deepEqual(doseAlarmDays('2026-10-01'), ['2026-09-30', '2026-10-01', '2026-10-02']);
});

test('old marks are pruned, recent ones kept', () => {
  const now = new Date('2026-09-24T12:00:00.000Z');
  const marks = {
    old: { stopped: true as const, updatedAt: '2026-09-20T12:00:00.000Z' },
    recent: { stopped: true as const, updatedAt: '2026-09-24T11:00:00.000Z' },
  };
  assert.deepEqual(Object.keys(pruneMarks(marks, now)), ['recent']);
});
