// Imports inside this folder carry their `.ts` extension because these modules
// are loaded by Node itself when the tests run, and Node's resolver — unlike
// Metro's — does not guess at extensions.
import { parseWhen } from './parse-when.ts';
import type { VoiceCommand, VoiceContext, NavigationTarget } from './types.ts';

/**
 * Turns one spoken sentence into one thing to do.
 *
 * This is a closed grammar, not a model: everything it understands is written
 * out below, and everything it doesn't comes back as `dictation` for the user
 * to look at. It is a pure function of the transcript and a little context, so
 * it can be tested exhaustively without a microphone.
 *
 * Intents that create a task read a due date off the end; intents that act on
 * one never do. "delete the milk one tomorrow" is not a task due tomorrow — it
 * is someone describing which task they mean, and stripping words from that
 * hint would make it harder to match, not easier.
 */

/** Strips the punctuation a recognizer adds, plus the politeness people speak. */
function tidy(transcript: string): string {
  return transcript
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^(?:please|hey|ok|okay)[,\s]+/i, '')
    .replace(/[.!?]+$/, '')
    .trim();
}

/**
 * Case, accents and punctuation all get in the way of comparing a spoken name
 * to a stored one. `normalize` is guarded because not every JS engine this
 * runs on is obliged to have it.
 */
function fold(value: string): string {
  const stripped =
    typeof value.normalize === 'function' ? value.normalize('NFD').replace(/[̀-ͯ]/g, '') : value;
  return stripped
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Finds the group member someone just named. A first name is enough — people
 * say "ask Maria", not "ask Maria Santos" — but an ambiguous first name
 * matches nobody rather than the wrong person.
 */
function findMember(spoken: string, memberNames: string[]): string | null {
  const said = fold(spoken);
  if (!said) return null;

  const exact = memberNames.filter((name) => fold(name) === said);
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) return null;

  const byFirstName = memberNames.filter((name) => fold(name).split(' ')[0] === said);
  if (byFirstName.length === 1) return byFirstName[0];
  if (byFirstName.length > 1) return null;

  const byPrefix = memberNames.filter((name) => fold(name).startsWith(`${said} `));
  return byPrefix.length === 1 ? byPrefix[0] : null;
}

const NAVIGATION: Record<string, NavigationTarget> = {
  tasks: 'tasks',
  task: 'tasks',
  'task list': 'tasks',
  list: 'tasks',
  history: 'history',
  done: 'history',
  group: 'group',
  groups: 'group',
  settings: 'settings',
  preferences: 'settings',
};

function withWhen(rawTitle: string, now: Date): { title: string; dueAt: Date | null } {
  const { dueAt, rest } = parseWhen(rawTitle, now);
  return { title: (rest || rawTitle).trim(), dueAt };
}

export function parseVoiceCommand(transcript: string, ctx: VoiceContext): VoiceCommand {
  const text = tidy(transcript);
  if (!text) return { kind: 'dictation', text: '' };

  // "undo" and "open history" are whole sentences, so they are checked before
  // anything that reads a sentence as a verb plus a subject.
  if (/^undo(?:\s+that)?$/i.test(text)) return { kind: 'undo' };

  const navigate = /^(?:open|go\s+to|show|switch\s+to)\s+(?:my\s+|the\s+)?(.+)$/i.exec(text);
  if (navigate) {
    const target = NAVIGATION[fold(navigate[1])];
    if (target) return { kind: 'navigate', to: target };
  }

  // Checked before "ask/tell <someone> to …", which would otherwise read the
  // "me" in "remind me to" as a group member.
  const selfReminder =
    /^(?:remind\s+me\s+to|note\s+to\s+self[,:]?|don'?t\s+forget\s+to)\s+(.+)$/i.exec(text) ??
    /^i\s+(?:need|have|want|ought|got)\s+to\s+(.+)$/i.exec(text);
  if (selfReminder) {
    const { title, dueAt } = withWhen(selfReminder[1], ctx.now);
    // Saying "remind me" is asking for the alarm, not just a due date — but
    // there's nothing to alarm on if no time was actually resolved ("remind
    // me to breathe" has no dueAt, so no alarm to enable).
    return { kind: 'addTask', title, dueAt, wantsAlarm: dueAt !== null };
  }

  const askSomeone = /^(?:ask|tell|get|remind)\s+(.+?)\s+to\s+(.+)$/i.exec(text);
  if (askSomeone) {
    const assignee = findMember(askSomeone[1], ctx.memberNames);
    // A name nobody in the group answers to is just part of a sentence:
    // "ask the landlord to fix the tap" is a fine task to write down yourself.
    if (assignee) {
      const { title, dueAt } = withWhen(askSomeone[2], ctx.now);
      return { kind: 'requestTask', assignee, title, dueAt };
    }
  }

  const askFrom = /^request\s+(.+?)\s+from\s+(.+)$/i.exec(text);
  if (askFrom) {
    const assignee = findMember(askFrom[2], ctx.memberNames);
    if (assignee) {
      const { title, dueAt } = withWhen(askFrom[1], ctx.now);
      return { kind: 'requestTask', assignee, title, dueAt };
    }
  }

  const markDone = /^mark\s+(.+?)\s+(?:as\s+)?(?:done|complete|completed|finished)$/i.exec(text);
  if (markDone) return { kind: 'completeTask', titleHint: markDone[1] };

  const completed =
    /^(?:mark\s+)?(?:complete|completed|finish|finished|done\s+with)\s+(.+)$/i.exec(text) ??
    /^i\s+(?:just\s+)?(?:did|finished|completed)\s+(.+)$/i.exec(text) ??
    /^(?:tick|check|cross)\s+off\s+(.+)$/i.exec(text);
  if (completed) return { kind: 'completeTask', titleHint: completed[1] };

  const cancelled = /^cancel\s+(.+)$/i.exec(text);
  if (cancelled) return { kind: 'cancelRequest', titleHint: cancelled[1] };

  const deleted = /^(?:delete|remove|scrap|bin)\s+(.+)$/i.exec(text);
  if (deleted) return { kind: 'deleteTask', titleHint: deleted[1] };

  // The generic opener, last of the verbs: "add", "new task", "create a
  // reminder called …". The filler between the verb and the task is optional
  // in every combination, because speech does not come out tidily.
  const added =
    /^(?:add|create|new)\s+(?:a\s+|an\s+)?(?:new\s+)?(?:task|item|to-?do|reminder|note)?\s*(?:called|named|that\s+says|to|:)?\s*(.+)$/i.exec(
      text,
    );
  if (added) {
    const { title, dueAt } = withWhen(added[1], ctx.now);
    // A generic "add"/"create" never implies an alarm, even with a date said —
    // only the "remind me" phrasing above does that.
    return { kind: 'addTask', title, dueAt, wantsAlarm: false };
  }

  // No verb matched. Usually that is a task title exactly as spoken — but a
  // sentence that *ends by naming a time* is someone saying when, and nobody
  // means "buy milk tomorrow" to be a task called "buy milk tomorrow". People
  // drop the verb far more often than they drop the date.
  //
  // This leans entirely on parseWhen being anchored and refusing to leave a
  // stump: a sentence that merely mentions a day — "the meeting is on Friday",
  // "call mum about Friday's party" — finds no date here and stays dictation.
  const { dueAt, rest } = parseWhen(text, ctx.now);
  if (dueAt && rest) return { kind: 'addTask', title: rest, dueAt, wantsAlarm: false };

  return { kind: 'dictation', text };
}
