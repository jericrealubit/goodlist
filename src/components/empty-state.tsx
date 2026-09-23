import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ActionIcons, type IconName } from '@/constants/icons';
import { EasingBreathe, PulseCycle } from '@/constants/motion';
import { Spacing } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useTheme } from '@/hooks/use-theme';
import { useTokens } from '@/hooks/use-tokens';

type EmptyStateProps = {
  title: string;
  message?: string;
  /** A glyph in a soft circular backdrop above the title. Optional — most callers (Retry) skip it. */
  icon?: IconName;
  actionLabel?: string;
  /** Defaults to the retry glyph, which is what every caller wants today. */
  actionIcon?: IconName;
  onAction?: () => void;
  /** 'secondary' (default) suits a quiet Retry; a first-run "add" CTA wants 'primary' to stand out. */
  actionVariant?: 'primary' | 'secondary';
};

export function EmptyState({
  title,
  message,
  icon,
  actionLabel,
  actionIcon = ActionIcons.retry,
  onAction,
  actionVariant = 'secondary',
}: EmptyStateProps) {
  return (
    <ThemedView style={styles.container}>
      {icon ? <FloatingGlyph icon={icon} /> : null}
      <ThemedText type="subtitle" style={styles.centerText}>
        {title}
      </ThemedText>
      {message ? (
        <ThemedText themeColor="textSecondary" style={styles.centerText}>
          {message}
        </ThemedText>
      ) : null}
      {actionLabel && onAction ? (
        <PrimaryButton
          title={actionLabel}
          icon={actionIcon}
          onPress={onAction}
          variant={actionVariant}
          style={styles.action}
        />
      ) : null}
    </ThemedView>
  );
}

/**
 * A gentle continuous float, not a breathe/pulse — kept visually distinct
 * from the "live" pulse vocabulary (`pulse-dot.tsx`) so a quiet empty screen
 * doesn't read as though something urgent is happening. Respects reduced
 * motion the same way every animation added after `dev-signature-badge.tsx`
 * does: skip the shared value entirely rather than start and no-op it.
 */
function FloatingGlyph({ icon }: { icon: IconName }) {
  const theme = useTheme();
  const tokens = useTokens();
  const reducedMotion = useReducedMotion();
  const offset = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) return;
    offset.value = withRepeat(withTiming(1, { duration: PulseCycle * 1.5, easing: EasingBreathe }), -1, true);
  }, [offset, reducedMotion]);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: reducedMotion ? 0 : offset.value * -3 }],
  }));

  return (
    <Animated.View
      style={[
        styles.iconWell,
        { backgroundColor: theme.backgroundElement, borderRadius: tokens.radii.pill },
        floatStyle,
      ]}>
      <Ionicons name={icon} size={28} color={theme.textSecondary} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.six,
  },
  centerText: {
    textAlign: 'center',
  },
  iconWell: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  action: {
    // Full-width, like the Create/Join buttons on the Group screen — a
    // shrink-wrapped pill leaves the label hugging its rounded edges.
    alignSelf: 'stretch',
    marginTop: Spacing.two,
  },
});
