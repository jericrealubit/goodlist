/**
 * Works out which task someone just spoke about.
 *
 * "Finish the milk one" has to find a row, and the interesting part is not
 * finding it — it is knowing when *not* to. Guessing wrong on "delete" is far
 * worse than asking, so this returns a winner only when one task is clearly
 * ahead: it has to cover enough of what was said (`FLOOR`) *and* beat whatever
 * came second by a margin. Anything less hands back the few plausible rows and
 * lets the screen ask.
 *
 * Scoring is token overlap on the spoken side: of the words that carry
 * identity, how many appear in the title? Coverage of the *hint* rather than of
 * the title, so "milk" finds "Buy milk at the shop" without a long title being
 * punished for having other words in it.
 *
 * Nothing here imports anything: a pure function over a string and an array,
 * which is what lets `node --test` run it directly.
 */

/**
 * Words that carry no identity. "the milk one" is about milk, and a task
 * called "the one" is not something anyone says out loud.
 */
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'my', 'your', 'our', 'their', 'his', 'her', 'its',
  'one', 'ones', 'that', 'this', 'these', 'those', 'it', 'thing', 'task',
  'to', 'of', 'for', 'and', 'or', 'about', 'with', 'off', 'up', 'on', 'at',
]);

/** How much of what was said has to turn up in the title before it counts at all. */
const FLOOR = 0.5;

/** How far ahead of the runner-up the winner has to be to be called a winner. */
const MARGIN = 0.2;

/** Enough to choose from without turning the sheet into a second task list. */
const MAX_CANDIDATES = 3;

/**
 * Case, accents and punctuation all get in the way of comparing a spoken
 * fragment to a stored title. Guarded because not every JS engine this runs on
 * is obliged to have `normalize`.
 */
function fold(value: string): string {
  const stripped =
    typeof value.normalize === 'function' ? value.normalize('NFD').replace(/[̀-ͯ]/g, '') : value;
  return stripped
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** The words worth comparing — folded, split, and stripped of the ones that mean nothing. */
function tokenize(value: string): string[] {
  const folded = fold(value);
  if (!folded) return [];
  return folded.split(' ').filter((word) => word && !STOP_WORDS.has(word));
}

/** What fraction of the spoken words turn up in this title. */
function score(spoken: string[], title: string[]): number {
  if (!spoken.length) return 0;
  const found = spoken.filter((word) => title.includes(word)).length;
  return found / spoken.length;
}

export type TaskMatch<T> = {
  /** The one task that was clearly meant, or null when it wasn't clear. */
  match: T | null;
  /** The few worth asking about. Empty when there is a match, and when nothing was close. */
  candidates: T[];
};

export function matchTask<T extends { id: string; title: string }>(hint: string, tasks: T[]): TaskMatch<T> {
  const spoken = tokenize(hint);
  if (!spoken.length || !tasks.length) return { match: null, candidates: [] };

  const scored = tasks
    .map((task) => ({ task, value: score(spoken, tokenize(task.title)) }))
    .filter((row) => row.value > 0)
    .sort((a, b) => b.value - a.value);

  if (!scored.length) return { match: null, candidates: [] };

  const [best, runnerUp] = scored;
  const clearlyAhead = best.value >= FLOOR && (!runnerUp || best.value - runnerUp.value >= MARGIN);
  if (clearlyAhead) return { match: best.task, candidates: [] };

  return { match: null, candidates: scored.slice(0, MAX_CANDIDATES).map((row) => row.task) };
}
