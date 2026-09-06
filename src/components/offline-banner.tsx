import { useIsMutating } from '@tanstack/react-query';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useTokens } from '@/hooks/use-tokens';

export function OfflineBanner() {
  const isOnline = useOnlineStatus();
  const pendingCount = useIsMutating({ mutationKey: ['tasks'] });
  const tokens = useTokens();

  if (isOnline && pendingCount === 0) return null;

  return (
    <ThemedView type="backgroundElement" style={[styles.banner, { borderRadius: tokens.radii.md }]}>
      <ThemedText type="small" themeColor="textSecondary">
        {!isOnline
          ? "You're offline — changes will sync automatically."
          : `Syncing ${pendingCount} change${pendingCount === 1 ? '' : 's'}…`}
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  banner: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
});
