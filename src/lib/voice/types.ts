/**
 * What a spoken sentence turned out to mean.
 *
 * `dictation` is the important one: it is what an unrecognized sentence
 * becomes, and it is not an error. "buy milk on the way home" is a perfectly
 * good task title, and treating no-match as a title is what keeps voice input
 * forgiving instead of a command line you have to memorize.
 */
export type VoiceCommand =
  | { kind: 'addTask'; title: string; dueAt: Date | null; wantsAlarm: boolean }
  | { kind: 'requestTask'; assignee: string; title: string; dueAt: Date | null }
  | { kind: 'completeTask'; titleHint: string }
  | { kind: 'cancelRequest'; titleHint: string }
  | { kind: 'deleteTask'; titleHint: string }
  | { kind: 'undo' }
  | { kind: 'navigate'; to: NavigationTarget }
  | { kind: 'dictation'; text: string };

export type NavigationTarget = 'tasks' | 'history' | 'group' | 'settings';

export type VoiceContext = {
  /** The clock every relative date is resolved against. */
  now: Date;
  /** Display names of the group members this user can assign work to. */
  memberNames: string[];
};
