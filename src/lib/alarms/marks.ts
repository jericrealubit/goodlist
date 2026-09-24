import AsyncStorage from '@react-native-async-storage/async-storage';

import { pruneMarks, SNOOZE_MINUTES, type AlarmMarks } from '@/lib/alarms/ringing';

/**
 * Remembers, on this device, which alarms someone stopped or snoozed. It has
 * to outlive the app: stopping an alarm, then reopening the app a minute
 * later, mustn't start it ringing again.
 *
 * Device-local on purpose, like the notifications themselves — an alarm rings
 * on one phone, so it's answered on that phone. Finishing the task or logging
 * the dose is what syncs everywhere, and that answers the alarm too.
 *
 * A tiny external store (`subscribe`/`getMarks`) so `useSyncExternalStore`
 * re-renders whoever is showing or scheduling alarms the moment one is answered.
 */

const STORAGE_KEY = 'goodlist.alarm-marks';

let marks: AlarmMarks = {};
let loaded: Promise<void> | null = null;
let ready = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function persist() {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(marks)).catch(() => {});
}

/** Reads the stored marks once; later calls share the first read. */
export function loadMarks(): Promise<void> {
  loaded ??= AsyncStorage.getItem(STORAGE_KEY)
    .then((raw) => {
      const stored = raw ? (JSON.parse(raw) as AlarmMarks) : {};
      // Anything answered in this session before the read finished wins.
      marks = { ...pruneMarks(stored, new Date()), ...marks };
    })
    .catch(() => {})
    .finally(() => {
      ready = true;
      emit();
    });
  return loaded;
}

/**
 * False until the stored marks have been read. Until then nothing can be
 * called ringing: an alarm stopped a minute ago would flash back up at launch.
 */
export function marksReady(): boolean {
  return ready;
}

export function getMarks(): AlarmMarks {
  return marks;
}

export function subscribeMarks(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function update(next: AlarmMarks) {
  marks = next;
  emit();
  // After the first read, so an answer given during launch can't overwrite
  // everything stored before it (the read merges it in first).
  loadMarks().then(persist);
}

export function markStopped(keys: string[], now = new Date()): void {
  if (keys.length === 0) return;
  const updatedAt = now.toISOString();
  const next = { ...marks };
  for (const key of keys) next[key] = { stopped: true, updatedAt };
  update(next);
}

export function markSnoozed(key: string, now = new Date(), minutes = SNOOZE_MINUTES): void {
  const updatedAt = now.toISOString();
  update({ ...marks, [key]: { snoozedUntil: new Date(now.getTime() + minutes * 60_000).toISOString(), updatedAt } });
}

/** Signing out: the next person here starts with nothing answered. */
export function clearMarks(): void {
  update({});
}
