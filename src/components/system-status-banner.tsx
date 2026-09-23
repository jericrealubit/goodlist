import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Surface } from '@/components/surface';
import { ThemedText } from '@/components/themed-text';
import { ActionIcons } from '@/constants/icons';
import { Spacing } from '@/constants/theme';
import { useSystemStatusQuery } from '@/hooks/use-system-status-query';
import { useTheme } from '@/hooks/use-theme';

/**
 * Developer-controlled maintenance/status notice — see
 * docs/system-status-notice.md. Silent (renders null) whenever there's
 * nothing to say, exactly like ReminderStatusBanner: a screen that always
 * carries a warning teaches people to ignore it.
 */
export function SystemStatusBanner() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { data } = useSystemStatusQuery();

  if (!data?.message) return null;

  return (
    <Surface style={[styles.banner, { marginTop: insets.top + Spacing.three }]}>
      <Ionicons name={ActionIcons.systemStatus} size={18} color={theme.textSecondary} />
      <View style={styles.text}>
        <ThemedText type="small">{data.message}</ThemedText>
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    gap: Spacing.two,
    padding: Spacing.three,
    marginHorizontal: Spacing.three,
    alignItems: 'flex-start',
  },
  text: {
    flex: 1,
    gap: Spacing.one,
  },
});
