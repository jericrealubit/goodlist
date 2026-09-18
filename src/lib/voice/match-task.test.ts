import assert from 'node:assert/strict';
import { test } from 'node:test';

// Imports inside this folder carry their `.ts` extension because Node loads
// these modules itself when the tests run, and its resolver — unlike Metro's —
// does not guess at extensions.
import { matchTask } from './match-task.ts';

const TASKS = [
  { id: '1', title: 'Buy milk at the shop' },
  { id: '2', title: 'Call the vet' },
  { id: '3', title: 'Fold the laundry' },
];

test('the whole title, said exactly', () => {
  const { match, candidates } = matchTask('call the vet', TASKS);
  assert.equal(match?.id, '2');
  assert.deepEqual(candidates, []);
});

test('one distinctive word is enough', () => {
  assert.equal(matchTask('milk', TASKS).match?.id, '1');
  assert.equal(matchTask('laundry', TASKS).match?.id, '3');
});

test('the words people actually say around a task are ignored', () => {
  // "the … one" is how a spoken hint usually arrives, and it identifies nothing.
  assert.equal(matchTask('the milk one', TASKS).match?.id, '1');
  assert.equal(matchTask('that laundry thing', TASKS).match?.id, '3');
});

test('casing, punctuation and accents do not matter', () => {
  assert.equal(matchTask('MILK!', TASKS).match?.id, '1');
  assert.equal(matchTask('céll the vét', TASKS).match?.id, '2');
});

test('two plausible tasks are asked about rather than guessed between', () => {
  const similar = [
    { id: 'a', title: 'Do the laundry' },
    { id: 'b', title: 'Fold the laundry' },
  ];
  const { match, candidates } = matchTask('laundry', similar);
  assert.equal(match, null);
  assert.deepEqual(
    candidates.map((t) => t.id),
    ['a', 'b'],
  );
});

test('a clear winner still wins when something else half-matches', () => {
  // "buy milk" covers task 1 completely and task 4 only halfway.
  const withOverlap = [...TASKS, { id: '4', title: 'Buy bread' }];
  assert.equal(matchTask('buy milk', withOverlap).match?.id, '1');
});

test('nothing plausible returns nothing at all — not a bad guess', () => {
  const { match, candidates } = matchTask('feed the dinosaur', TASKS);
  assert.equal(match, null);
  assert.deepEqual(candidates, []);
});

test('a hint made only of filler matches nothing', () => {
  assert.deepEqual(matchTask('the one', TASKS), { match: null, candidates: [] });
  assert.deepEqual(matchTask('', TASKS), { match: null, candidates: [] });
});

test('an empty list matches nothing', () => {
  assert.deepEqual(matchTask('milk', []), { match: null, candidates: [] });
});

test('never offers more than three to choose between', () => {
  const many = [
    { id: 'a', title: 'Email the school' },
    { id: 'b', title: 'Email the plumber' },
    { id: 'c', title: 'Email the landlord' },
    { id: 'd', title: 'Email the vet' },
  ];
  const { match, candidates } = matchTask('email', many);
  assert.equal(match, null);
  assert.equal(candidates.length, 3);
});
