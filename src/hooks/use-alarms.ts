import { usePathname, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { useSession } from '@/contexts/session-context';
import { useDosesQuery, useMedicationsQuery } from '@/hooks/use-medications-query';
import { useOpenTasksQuery } from '@/hooks/use-tasks-query';
import { useToday } from '@/hooks/use-today';
import { listenForAlarmsReceived, syncAlarmFollowUps } from '@/lib/alarms/alarm-notifications';
import { getMarks, loadMarks, marksReady, subscribeMarks } from '@/lib/alarms/marks';
import { doseAlarmDays, doseAlarms, ringingAlarms, taskAlarms, type Alarm, type AlarmMarks } from '@/lib/alarms/ringing';
import { remindersSupported } from '@/lib/reminders';
import { configureTaskReminders } from '@/lib/task-reminders';

/** How often the open app checks whether an alarm has started ringing. */
const TICK_MS = 5_000;

export type AlarmState = {
  /** Every alarm that could ring: past-due-but-unanswered and upcoming. */
  alarms: Alarm[];
  ringing: Alarm[];
  marks: AlarmMarks;
  /** False until tasks, medicines and stored answers have loaded — before that, what's ringing isn't known. */
  ready: boolean;
  /** Re-reads the clock now, e.g. when an alarm notification arrives. */
  refresh: () => void;
};

/**
 * What's ringing, derived from the same caches the Tasks and Meds tabs use,
 * plus this device's Stop/Snooze answers. Used by the alarm screen and by
 * `useAlarms` below.
 */
export function useAlarmState(): AlarmState {
  const { user } = useSession();
  // Render can't read the clock (React Compiler rules), so it lives in state.
  const [now, setNow] = useState(() => new Date());
  const refresh = useCallback(() => setNow(new Date()), []);
  const marks = useSyncExternalStore(subscribeMarks, getMarks, getMarks);

  useEffect(() => {
    loadMarks();
    const timer = setInterval(refresh, TICK_MS);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [refresh]);

  const today = useToday();
  const days = useMemo(() => doseAlarmDays(today), [today]);
  const { data: tasks } = useOpenTasksQuery();
  const { data: meds } = useMedicationsQuery();
  const dosesQuery = useDosesQuery(days[0], days[2], remindersSupported);
  // If doses can't load (offline, first launch), ring as if none were logged:
  // an extra ring is the right side to err on for a medicine.
  const { data: loggedDoses, isError: dosesFailed } = dosesQuery;
  const doses = useMemo(() => loggedDoses ?? (dosesFailed ? [] : undefined), [loggedDoses, dosesFailed]);
  const userId = user?.id;

  const alarms = useMemo(() => {
    if (!userId || !tasks || !meds || !doses) return [];
    const mine = meds.filter((m) => m.owner_id === userId);
    return [...taskAlarms(tasks, userId), ...doseAlarms(mine, doses, days)];
  }, [userId, tasks, meds, doses, days]);

  // `marks` is replaced whenever the store emits, including when it finishes loading.
  const loadedMarks = marksReady();
  const ringing = useMemo(
    () => (loadedMarks ? ringingAlarms(alarms, marks, now) : []),
    [loadedMarks, alarms, marks, now],
  );

  return {
    alarms,
    ringing,
    marks,
    ready: remindersSupported && loadedMarks && !!userId && !!tasks && !!meds && !!doses,
    refresh,
  };
}

/**
 * Keeps unanswered alarms ringing. Mounted once, in the signed-in layout, for
 * the same reason as `useTaskReminders`: an alarm has to ring whichever screen
 * the app is on.
 *
 * - App open: shows the alarm screen (which loops the sound) whenever
 *   something is ringing, and keeps it up until everything is answered.
 * - App closed: keeps the follow-up notifications scheduled, so an unanswered
 *   alarm rings again every minute or so for two hours.
 *
 * No-op on web, where there are no alarms at all.
 */
export function useAlarms() {
  const router = useRouter();
  const pathname = usePathname();
  const { alarms, ringing, marks, ready, refresh } = useAlarmState();

  // Follow-ups: re-planned on every change, and each time the app comes
  // forward, which is also what tops them back up as earlier ones fire.
  useEffect(() => {
    if (!ready) return;
    const sync = () => {
      configureTaskReminders()
        .then(() => syncAlarmFollowUps(alarms, marks))
        .catch(() => {});
    };
    sync();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') sync();
    });
    return () => subscription.remove();
  }, [ready, alarms, marks]);

  // An alarm notification arriving while the app is open: re-read the clock
  // now rather than on the next tick, so the alarm screen is up at once.
  useEffect(() => {
    if (!remindersSupported) return;
    return listenForAlarmsReceived(() => refresh());
  }, [refresh]);

  // Present the alarm screen. `presenting` stops a second push while the
  // first is still animating in; it clears once the screen is showing or
  // nothing is ringing any more.
  const presenting = useRef(false);
  const isRinging = ringing.length > 0;
  useEffect(() => {
    if (pathname === '/alarm' || !isRinging) {
      presenting.current = false;
      return;
    }
    if (!ready || presenting.current) return;
    presenting.current = true;
    router.push('/alarm');
  }, [isRinging, pathname, ready, router]);
}
