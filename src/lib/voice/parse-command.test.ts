import assert from 'node:assert/strict';
import { test } from 'node:test';

import { parseVoiceCommand } from './parse-command.ts';
import type { VoiceContext } from './types.ts';

/** Friday, 18 September 2026, 10:00 local — same clock as the parse-when tests. */
const NOW = new Date(2026, 8, 18, 10, 0, 0, 0);

const CTX: VoiceContext = {
  now: NOW,
  memberNames: ['Maria Santos', 'Ben', 'José Rivera'],
};

function parse(transcript: string, ctx: VoiceContext = CTX) {
  return parseVoiceCommand(transcript, ctx);
}

test('anything unrecognized comes back as dictation, not an error', () => {
  assert.deepEqual(parse('buy milk on the way home'), {
    kind: 'dictation',
    text: 'buy milk on the way home',
  });
  assert.deepEqual(parse(''), { kind: 'dictation', text: '' });
});

test('the recognizer’s punctuation and spoken politeness are dropped', () => {
  assert.deepEqual(parse('Please add milk.'), { kind: 'addTask', title: 'milk', dueAt: null });
  assert.deepEqual(parse('  add    milk  '), { kind: 'addTask', title: 'milk', dueAt: null });
});

test('every way of saying "add"', () => {
  const expected = { kind: 'addTask', title: 'call the vet', dueAt: null };
  assert.deepEqual(parse('add call the vet'), expected);
  assert.deepEqual(parse('add a task called call the vet'), expected);
  assert.deepEqual(parse('create a new reminder to call the vet'), expected);
  assert.deepEqual(parse('new task call the vet'), expected);
  assert.deepEqual(parse('remind me to call the vet'), expected);
  assert.deepEqual(parse('note to self, call the vet'), expected);
  assert.deepEqual(parse("don't forget to call the vet"), expected);
  assert.deepEqual(parse('I need to call the vet'), expected);
});

test('a task that creates one reads its due date off the end', () => {
  assert.deepEqual(parse('remind me to call the vet tomorrow'), {
    kind: 'addTask',
    title: 'call the vet',
    dueAt: new Date(2026, 8, 19, 9, 0, 0, 0),
  });
});

test('asking a group member for something', () => {
  assert.deepEqual(parse('ask Maria to pick up the parcel tomorrow'), {
    kind: 'requestTask',
    assignee: 'Maria Santos',
    title: 'pick up the parcel',
    dueAt: new Date(2026, 8, 19, 9, 0, 0, 0),
  });
  assert.deepEqual(parse('tell Ben to take the bins out'), {
    kind: 'requestTask',
    assignee: 'Ben',
    title: 'take the bins out',
    dueAt: null,
  });
  assert.deepEqual(parse('request a lift to the airport from Ben'), {
    kind: 'requestTask',
    assignee: 'Ben',
    title: 'a lift to the airport',
    dueAt: null,
  });
});

test('a first name is enough, and so is a name the recognizer stripped the accents off', () => {
  assert.deepEqual(parse('ask jose to call the plumber'), {
    kind: 'requestTask',
    assignee: 'José Rivera',
    title: 'call the plumber',
    dueAt: null,
  });
  assert.deepEqual(parse('ask maria santos to call the plumber'), {
    kind: 'requestTask',
    assignee: 'Maria Santos',
    title: 'call the plumber',
    dueAt: null,
  });
});

test('a name nobody in the group answers to is just part of a sentence', () => {
  assert.deepEqual(parse('ask the landlord to fix the tap'), {
    kind: 'dictation',
    text: 'ask the landlord to fix the tap',
  });
});

test('an ambiguous first name picks nobody rather than the wrong person', () => {
  const twoMarias: VoiceContext = { now: NOW, memberNames: ['Maria Santos', 'Maria Lopez'] };
  assert.deepEqual(parse('ask maria to call the plumber', twoMarias), {
    kind: 'dictation',
    text: 'ask maria to call the plumber',
  });
  // Said in full, there is no ambiguity left.
  assert.deepEqual(parse('ask maria lopez to call the plumber', twoMarias), {
    kind: 'requestTask',
    assignee: 'Maria Lopez',
    title: 'call the plumber',
    dueAt: null,
  });
});

test('"remind me to" is a note to self, not a request to someone called "me"', () => {
  assert.deepEqual(parse('remind me to buy milk'), { kind: 'addTask', title: 'buy milk', dueAt: null });
});

test('finishing a task', () => {
  const expected = { kind: 'completeTask', titleHint: 'the laundry' };
  assert.deepEqual(parse('finish the laundry'), expected);
  assert.deepEqual(parse('complete the laundry'), expected);
  assert.deepEqual(parse('done with the laundry'), expected);
  assert.deepEqual(parse('tick off the laundry'), expected);
  assert.deepEqual(parse('I just finished the laundry'), expected);
  assert.deepEqual(parse('mark the laundry as done'), expected);
  assert.deepEqual(parse('mark the laundry done'), expected);
});

test('cancelling and deleting are told apart', () => {
  assert.deepEqual(parse('cancel the dentist'), { kind: 'cancelRequest', titleHint: 'the dentist' });
  assert.deepEqual(parse('delete the dentist'), { kind: 'deleteTask', titleHint: 'the dentist' });
  assert.deepEqual(parse('remove the dentist'), { kind: 'deleteTask', titleHint: 'the dentist' });
});

test('a hint naming an existing task keeps every word, dates included', () => {
  // "tomorrow" here says which task, not when it is due — stripping it would
  // make the task harder to find, not easier.
  assert.deepEqual(parse('delete the milk one tomorrow'), {
    kind: 'deleteTask',
    titleHint: 'the milk one tomorrow',
  });
});

test('undo', () => {
  assert.deepEqual(parse('undo'), { kind: 'undo' });
  assert.deepEqual(parse('Undo that.'), { kind: 'undo' });
  // Not a bare "undo" — that is a task about undoing something.
  assert.deepEqual(parse('undo the last commit'), {
    kind: 'dictation',
    text: 'undo the last commit',
  });
});

test('navigation', () => {
  assert.deepEqual(parse('open history'), { kind: 'navigate', to: 'history' });
  assert.deepEqual(parse('go to settings'), { kind: 'navigate', to: 'settings' });
  assert.deepEqual(parse('show my group'), { kind: 'navigate', to: 'group' });
  assert.deepEqual(parse('open my task list'), { kind: 'navigate', to: 'tasks' });
  // Somewhere there is no screen for is a task, not a failed command.
  assert.deepEqual(parse('open the front door'), {
    kind: 'dictation',
    text: 'open the front door',
  });
});

test('titles keep their original casing', () => {
  assert.deepEqual(parse('add Email Dr Rivera'), {
    kind: 'addTask',
    title: 'Email Dr Rivera',
    dueAt: null,
  });
});
