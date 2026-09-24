import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';

import { useSession } from '@/contexts/session-context';
import { buildLogDoseInput, useLogDoseMutation } from '@/hooks/use-medication-mutations';
import { useMedicationsQuery } from '@/hooks/use-medications-query';
import { snoozeAlarm, stopAlarms } from '@/lib/alarms/answer';
import { doseAlarmKey } from '@/lib/alarms/ringing';
import {
  doseDay,
  getReminderPermission,
  listenForDoseResponses,
  requestReminderPermission,
  syncReminders,
  type ReminderPermission,
} from '@/lib/reminders';

/**
 * Keeps this device's scheduled reminders in step with the medications cache,
 * and turns a reminder's Taken / Snooze / Stop / tap into the matching action.
 * Keeping an unanswered reminder ringing is `useAlarms`' job.
 *
 * Mounted once, in the signed-in layout, rather than on the Meds tab: a
 * reminder has to be answered whichever screen the app opens on, and a medicine
 * edited on another device has to reschedule here even if Meds is never opened.
 */
export function useMedicationReminders() {
  const router = useRouter();
  const { user } = useSession();
  const { data: meds } = useMedicationsQuery();
  const logDose = useLogDoseMutation();

  const mine = useMemo(() => (meds ?? []).filter((m) => m.owner_id === user?.id), [meds, user?.id]);

  // Re-sync on every change, and each time the app comes forward — that is
  // what retires a course whose end date has passed and starts one whose start
  // date has arrived, since repeating triggers can't express either.
  useEffect(() => {
    if (!meds || !user) return;
    const sync = () => {
      syncReminders(mine).catch(() => {});
    };
    sync();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') sync();
    });
    return () => subscription.remove();
  }, [meds, mine, user]);

  const userId = user?.id;
  const mutate = logDose.mutate;
  useEffect(() => {
    if (!userId) return;
    return listenForDoseResponses((response) => {
      const alarmKey = doseAlarmKey(response.payload.medicationId, doseDay(response), response.payload.time);
      if (response.action === 'snooze') {
        snoozeAlarm(alarmKey);
        return;
      }
      if (response.action === 'stop') {
        stopAlarms([alarmKey]);
        return;
      }
      if (response.action === 'taken') {
        // Logging the dose answers the alarm anyway; stopping it too silences
        // it now, before the log reaches the cache.
        stopAlarms([alarmKey]);
        mutate(
          buildLogDoseInput(
            {
              medicationId: response.payload.medicationId,
              slotDate: doseDay(response),
              slotTime: response.payload.time,
              status: 'taken',
            },
            userId,
          ),
        );
      }
      router.navigate('/meds');
    });
  }, [userId, mutate, router]);
}

/**
 * Current notification permission, re-read whenever the app comes forward
 * (e.g. back from Settings), plus `request`, which asks and records the answer.
 */
export function useReminderPermission(): {
  permission: ReminderPermission | null;
  request: () => Promise<ReminderPermission>;
} {
  const [permission, setPermission] = useState<ReminderPermission | null>(null);
  useEffect(() => {
    const read = () => {
      getReminderPermission().then(setPermission, () => setPermission(null));
    };
    read();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') read();
    });
    return () => subscription.remove();
  }, []);

  async function request() {
    const next = await requestReminderPermission();
    setPermission(next);
    return next;
  }

  return { permission, request };
}
