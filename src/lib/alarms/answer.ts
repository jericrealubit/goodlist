import { dismissAlarms, silenceAlarms } from '@/lib/alarms/alarm-notifications';
import { markSnoozed, markStopped } from '@/lib/alarms/marks';

/**
 * The two ways to answer an alarm without finishing the thing itself, shared
 * by the alarm screen and the notification buttons so both behave the same.
 *
 * Stopping silences right away: nothing will reschedule a stopped alarm.
 * Snoozing only clears the tray — the sync in `useAlarms` replaces the
 * pending follow-ups with the snooze's own ring, and cancelling here too
 * could race it and cancel that ring.
 */
export function stopAlarms(keys: string[]): void {
  markStopped(keys);
  silenceAlarms(keys).catch(() => {});
}

export function snoozeAlarm(key: string): void {
  markSnoozed(key);
  dismissAlarms([key]).catch(() => {});
}
