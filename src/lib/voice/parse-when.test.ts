import assert from 'node:assert/strict';
import { test } from 'node:test';

import { parseWhen } from './parse-when.ts';

/** Friday, 18 September 2026, 10:00 local. Every expectation below is relative to this. */
const NOW = new Date(2026, 8, 18, 10, 0, 0, 0);

function due(text: string): Date | null {
  return parseWhen(text, NOW).dueAt;
}

function rest(text: string): string {
  return parseWhen(text, NOW).rest;
}

function at(year: number, month: number, day: number, hour = 9, minute = 0): Date {
  return new Date(year, month, day, hour, minute, 0, 0);
}

test('a task with no date keeps every word and gets no due date', () => {
  assert.deepEqual(parseWhen('buy milk', NOW), { dueAt: null, rest: 'buy milk' });
});

test('empty input', () => {
  assert.deepEqual(parseWhen('   ', NOW), { dueAt: null, rest: '' });
});

test('today and tomorrow default to nine in the morning', () => {
  assert.deepEqual(due('buy milk today'), at(2026, 8, 18));
  assert.deepEqual(due('buy milk tomorrow'), at(2026, 8, 19));
  assert.equal(rest('buy milk tomorrow'), 'buy milk');
});

test('parts of the day carry their own hour', () => {
  assert.deepEqual(due('call mum tonight'), at(2026, 8, 18, 20));
  assert.deepEqual(due('call mum this evening'), at(2026, 8, 18, 20));
  assert.deepEqual(due('call mum tomorrow morning'), at(2026, 8, 19, 9));
  assert.deepEqual(due('call mum tomorrow afternoon'), at(2026, 8, 19, 14));
  assert.deepEqual(due('call mum tomorrow night'), at(2026, 8, 19, 20));
});

test('a weekday is never today — said on a Friday, "on Friday" is the next one', () => {
  assert.deepEqual(due('pay rent on friday'), at(2026, 8, 25));
  assert.deepEqual(due('pay rent on monday'), at(2026, 8, 21));
});

test('"next Friday" means the same Friday as "Friday"', () => {
  assert.deepEqual(due('pay rent next friday'), due('pay rent on friday'));
});

test('weekend, next week, next month', () => {
  assert.deepEqual(due('wash the car this weekend'), at(2026, 8, 19));
  assert.deepEqual(due('wash the car next week'), at(2026, 8, 25));
  assert.deepEqual(due('wash the car next month'), at(2026, 9, 18));
});

test('relative offsets keep the current time of day', () => {
  assert.deepEqual(due('renew the passport in 3 days'), at(2026, 8, 21, 10));
  assert.deepEqual(due('renew the passport in two weeks'), at(2026, 9, 2, 10));
  assert.deepEqual(due('take the bread out in an hour'), at(2026, 8, 18, 11));
  assert.deepEqual(due('take the bread out in 20 minutes'), at(2026, 8, 18, 10, 20));
});

test('a bare hour is read as the afternoon, and rolls to tomorrow once it has passed', () => {
  assert.deepEqual(due('call john at 5'), at(2026, 8, 18, 17));
  // 9am is behind us at 10am, so it means tomorrow.
  assert.deepEqual(due('call john at 9'), at(2026, 8, 19, 9));
  assert.deepEqual(due('call john at 5:30 pm'), at(2026, 8, 18, 17, 30));
  assert.deepEqual(due('call john at 11am'), at(2026, 8, 18, 11));
  assert.deepEqual(due('call john at noon'), at(2026, 8, 18, 12));
  assert.deepEqual(due('call john at midnight'), at(2026, 8, 19, 0));
});

test('a date and a time, said in either order', () => {
  assert.deepEqual(due('collect the parcel tomorrow at 5pm'), at(2026, 8, 19, 17));
  assert.deepEqual(due('collect the parcel at 5pm tomorrow'), at(2026, 8, 19, 17));
  assert.equal(rest('collect the parcel at 5pm tomorrow'), 'collect the parcel');
});

test('calendar dates, both ways round, and rolling into next year', () => {
  assert.deepEqual(due('book the table on september 20'), at(2026, 8, 20));
  assert.deepEqual(due('book the table on the 20th of september'), at(2026, 8, 20));
  assert.deepEqual(due('book the table on sept 20th'), at(2026, 8, 20));
  // January has already gone this year.
  assert.deepEqual(due('book the table on january 5'), at(2027, 0, 5));
});

test('a day the month does not have is not a date', () => {
  assert.deepEqual(parseWhen('book the table on february 31', NOW), {
    dueAt: null,
    rest: 'book the table on february 31',
  });
});

test('a date phrase only counts at the end', () => {
  assert.deepEqual(parseWhen("call mum about friday's party", NOW), {
    dueAt: null,
    rest: "call mum about friday's party",
  });
});

test('stripping never leaves a stump', () => {
  // "about friday" is what the task is about, not when it is due.
  assert.deepEqual(parseWhen('call mum about friday', NOW), {
    dueAt: null,
    rest: 'call mum about friday',
  });
  // And a task that is nothing but a date keeps its words.
  assert.deepEqual(parseWhen('tomorrow', NOW), { dueAt: null, rest: 'tomorrow' });
});

test('"for" introduces a date the same way "on" does', () => {
  assert.deepEqual(due('buy milk for tomorrow'), at(2026, 8, 19));
  assert.equal(rest('buy milk for tomorrow'), 'buy milk');
});

test('a trailing comma goes with the date phrase', () => {
  assert.equal(rest('buy milk, tomorrow'), 'buy milk');
});

test('a number at the end is not a time', () => {
  assert.deepEqual(parseWhen('buy 2', NOW), { dueAt: null, rest: 'buy 2' });
  assert.deepEqual(parseWhen('order 6 chairs', NOW), { dueAt: null, rest: 'order 6 chairs' });
});

test('the title keeps its original casing', () => {
  assert.equal(rest('Email Dr Rivera Tomorrow'), 'Email Dr Rivera');
});
