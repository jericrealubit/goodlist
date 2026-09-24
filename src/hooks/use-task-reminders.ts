import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useSession } from '@/contexts/session-context';
import { useOpenTasksQuery } from '@/hooks/use-tasks-query';
import { snoozeAlarm, stopAlarms } from '@/lib/alarms/answer';
import { listenForTaskReminderResponses, syncTaskReminders } from '@/lib/task-reminders';

/**
 * Keeps this device's scheduled task alarms in step with the open-tasks
 * cache, opens a task when its alarm is tapped, and answers its Stop and
 * Snooze buttons. Keeping an unanswered alarm ringing is `useAlarms`' job.
 *
 * Mounted once, in the signed-in layout, rather than the Tasks tab — same
 * reasoning as `useMedicationReminders`: an alarm has to be answerable
 * whichever screen the app opens on, and a task edited on another device has
 * to reschedule here even if Tasks is never opened.
 *
 * Unlike medicines, `useOpenTasksQuery()` already returns every task
 * relevant to the signed-in user (created by them, assigned to them, or
 * requested of them) mixed together — the assignee-only filter (a requester
 * shouldn't be buzzed for a task they handed off) lives inside
 * `syncTaskReminders` itself, not here.
 */
export function useTaskReminders() {
  const router = useRouter();
  const { user } = useSession();
  const { data: tasks } = useOpenTasksQuery();

  useEffect(() => {
    if (!tasks || !user) return;
    const sync = () => {
      syncTaskReminders(tasks, user.id).catch(() => {});
    };
    sync();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') sync();
    });
    return () => subscription.remove();
  }, [tasks, user]);

  useEffect(() => {
    return listenForTaskReminderResponses(({ taskId, alarmKey, action }) => {
      if (action === 'stop' || action === 'snooze') {
        if (!alarmKey) return;
        if (action === 'stop') stopAlarms([alarmKey]);
        else snoozeAlarm(alarmKey);
        return;
      }
      // A tap opens the task; if it's still ringing, the alarm screen comes
      // up over it, and stopping lands back here on the task.
      router.push({ pathname: '/task/[id]', params: { id: taskId } });
    });
  }, [router]);
}
