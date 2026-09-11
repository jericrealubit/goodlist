import { useIsMutating } from '@tanstack/react-query';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useTabScreenInsets } from '@/hooks/use-tab-screen-insets';
import { useTokens } from '@/hooks/use-tokens';

/**
 * Floats over the top-right of the Tasks screen rather than sitting in the
 * layout: as an in-flow row it appeared and disappeared with connectivity,
 * shifting the whole task list down and — with the keyboard open — pushing the
 * compose bar off screen. Absolute keeps a transient status message from
 * moving the things the user is actually aiming at. `top` mirrors the screen
 * header's own padding so the chip lines up with the title beside it.
 */
export function OfflineBanner() {
  const isOnline = useOnlineStatus();
  const pendingCount = useIsMutating({ mutationKey: ['tasks'] });
  const tokens = useTokens();
  const { topInset } = useTabScreenInsets();

  if (isOnline && pendingCount === 0) return null;

  return (
    <ThemedView
      type="backgroundElement"
      // Never a tap target — it overlays the header and the tab switcher.
      pointerEvents="none"
      style={[styles.chip, { top: topInset + Spacing.two, borderRadius: tokens.radii.pill }]}>
      <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
        {!isOnline ? 'Offline — will sync' : `Syncing ${pendingCount}…`}
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  chip: {
    position: 'absolute',
    right: Spacing.four,
    maxWidth: '55%',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    // Painted last in the tree, but both are set so the chip stays above the
    // list on Android (elevation) as well as everywhere else (zIndex).
    zIndex: 10,
    elevation: 3,
  },
});
