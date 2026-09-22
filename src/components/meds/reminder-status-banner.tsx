import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { Surface } from '@/components/surface';
import { ThemedText } from '@/components/themed-text';
import { ActionIcons } from '@/constants/icons';
import { Spacing } from '@/constants/theme';
import { useReminderPermission } from '@/hooks/use-medication-reminders';
import { useTheme } from '@/hooks/use-theme';
import { toDayKey } from '@/lib/calendar/day';
import { planReminders } from '@/lib/medications/reminder-plan';
import { syncReminders } from '@/lib/reminders';
import type { Medication } from '@/lib/types';

/**
 * Says when reminders *won't* arrive — permission off, the browser, or more
 * than the platform will hold. Silent when everything works, because a medicine
 * screen that always carries a warning teaches people to ignore it.
 */
export function ReminderStatusBanner({ medications }: { medications: Medication[] }) {
  const theme = useTheme();
  const { permission, request } = useReminderPermission();
  const [today] = useState(() => toDayKey(new Date()));
  const wantsReminders = medications.some((m) => m.reminders_enabled);
  const { overflow } = planReminders(medications, today);

  let message: string | null = null;
  let action: { label: string; onPress: () => void } | null = null;

  if (!wantsReminders) {
    message = null;
  } else if (permission === 'unsupported') {
    message = 'Reminders arrive on the Goodlist phone app. Here you can still log every dose.';
  } else if (permission === 'denied') {
    message = 'Notifications are off for Goodlist, so medicine reminders can’t reach you.';
    action = { label: 'Open settings', onPress: () => Linking.openSettings() };
  } else if (permission === 'undetermined') {
    message = 'Allow notifications so Goodlist can remind you at each dose time.';
    action = {
      label: 'Allow',
      onPress: () => {
        request().then((granted) => {
          if (granted === 'granted') syncReminders(medications).catch(() => {});
        });
      },
    };
  } else if (overflow > 0) {
    message = `${overflow} reminder${overflow === 1 ? '' : 's'} won’t fit on this phone — it holds 60 at most. Fewer times or every-day schedules use fewer.`;
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
