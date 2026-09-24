import { Ionicons } from '@expo/vector-icons';
import { Linking, StyleSheet, View } from 'react-native';

import { Surface } from '@/components/surface';
import { ThemedText } from '@/components/themed-text';
import { ActionIcons } from '@/constants/icons';
import { Spacing } from '@/constants/theme';
import { useSession } from '@/contexts/session-context';
import { useReminderPermission } from '@/hooks/use-medication-reminders';
import { useTheme } from '@/hooks/use-theme';
import { syncTaskReminders } from '@/lib/task-reminders';
import type { Task } from '@/lib/types';

/**
 * Tells someone with alarms set what it takes for them to actually ring:
 * notifications allowed for Goodlist. Silent when everything is in place, and
 * when no task has an alarm — the calendar is where alarmed tasks show up, so
 * it's where "why didn't it ring?" gets asked, but a warning on a calendar
 * that has no alarms would only teach people to ignore it.
 */
export function AlarmStatusBanner({ tasks }: { tasks: Task[] }) {
  const theme = useTheme();
  const { user } = useSession();
  const { permission, request } = useReminderPermission();
  const alarmed = tasks.filter((t) => t.alarm_enabled && t.status === 'open' && t.assignee_id === user?.id);

  let message: string | null = null;
  let action: { label: string; onPress: () => void } | null = null;

  if (alarmed.length === 0) {
    message = null;
  } else if (permission === 'unsupported') {
    message = 'Alarms ring on the Goodlist phone app. Here you can still see when each one is due.';
  } else if (permission === 'denied') {
    message =
      'Alarms are set, but notifications are off for Goodlist, so they won’t ring. Open settings, allow notifications, and on Android also allow Alarms & reminders.';
    action = { label: 'Open settings', onPress: () => Linking.openSettings() };
  } else if (permission === 'undetermined') {
    message = `Allow notifications so ${alarmed.length === 1 ? 'your alarm' : 'your alarms'} can ring at the time you set.`;
    action = {
      label: 'Allow alarms',
      onPress: () => {
        request().then((granted) => {
          if (granted === 'granted' && user) syncTaskReminders(tasks, user.id).catch(() => {});
        });
      },
    };
  }

  if (!message) return null;

  return (
    <Surface style={styles.banner}>
      <Ionicons name={ActionIcons.remindersOff} size={18} color={theme.textSecondary} />
      <View style={styles.text}>
        <ThemedText type="small">{message}</ThemedText>
        {action ? (
          <ThemedText type="linkPrimary" onPress={action.onPress} accessibilityRole="button">
            {action.label}
          </ThemedText>
        ) : null}
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    gap: Spacing.two,
    padding: Spacing.three,
    alignItems: 'flex-start',
  },
  text: {
    flex: 1,
    gap: Spacing.one,
  },
});
