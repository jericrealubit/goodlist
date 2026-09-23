import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Surface } from '@/components/surface';
import { ThemedText } from '@/components/themed-text';
import { Duration, EasingStandard } from '@/constants/motion';
import { Spacing } from '@/constants/theme';

type ToastProps = {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Clears space above a floating tab bar/compose bar so the toast doesn't hide behind it. */
  bottomOffset?: number;
};

/**
 * A transient confirmation that doesn't need the row that caused it to stay
 * on screen or scrolled into view — logging a dose already has a permanent
 * per-row Undo once it's taken/skipped; this is the immediate "yes, that
 * saved" a caller gets without looking for that row.
 *
 * The fade-in is driven by our own `useSharedValue`/`useEffect`, the same
 * shape every other one-shot animation in the app uses (see
 * `theme-transition.tsx`), rather than Reanimated's declarative `entering`
 * prop — that API's web support turned out to be unreliable enough in
 * testing that the toast silently never mounted on web at all.
 */
export function Toast({ message, actionLabel, onAction, bottomOffset = 0 }: ToastProps) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: Duration.base, easing: EasingStandard });
  }, [opacity]);

  const fadeStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View pointerEvents="box-none" style={[styles.wrap, { bottom: bottomOffset }, fadeStyle]}>
      <Surface style={styles.toast}>
        <ThemedText type="smallBold" style={styles.flex}>
          {message}
        </ThemedText>
        {actionLabel && onAction ? (
          <Pressable onPress={onAction} hitSlop={8} accessibilityRole="button" accessibilityLabel={actionLabel}>
            <ThemedText type="smallBold" themeColor="accent">
              {actionLabel}
            </ThemedText>
          </Pressable>
        ) : null}
      </Surface>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: Spacing.four,
    right: Spacing.four,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    width: '100%',
  },
  flex: {
    flex: 1,
  },
});
