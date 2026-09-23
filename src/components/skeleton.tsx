import { useEffect } from 'react';
import { View, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { useSurfaceStyle } from '@/components/surface';
import { EasingBreathe, PulseCycle } from '@/constants/motion';
import { Spacing } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useTheme } from '@/hooks/use-theme';

type SkeletonBlockProps = {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: ViewStyle;
};

/**
 * One placeholder block, shaped like the content it stands in for by the
 * caller passing `width`/`height`/`radius` to match — a screen's loading
 * state should already look like that screen, not a generic spinner every
 * screen shares.
 *
 * The shimmer is an opacity breathe (the same `PulseCycle`/`EasingBreathe`
 * every other continuous animation in the app uses), not a moving gradient
 * sweep — one fewer dependency, and it reads as one motion system rather
 * than this being its own special effect.
 */
export function SkeletonBlock({ width = '100%', height = 16, radius = 8, style }: SkeletonBlockProps) {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const beat = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) return;
    beat.value = withRepeat(withTiming(1, { duration: PulseCycle, easing: EasingBreathe }), -1, true);
  }, [beat, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: reducedMotion ? 0.65 : 0.45 + beat.value * 0.3,
  }));

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={[
        { width, height, borderRadius: radius, backgroundColor: theme.backgroundElement },
        animatedStyle,
        style,
      ]}
    />
  );
}

/** A skeleton shaped like one `<StatTile>` — mirrors stat-tile.tsx's own layout/spacing. */
export function StatTileSkeleton({ hero }: { hero?: boolean }) {
  const surface = useSurfaceStyle();
  return (
    <View style={[surface, { flex: 1, padding: Spacing.three, gap: Spacing.half, justifyContent: 'flex-start' }]}>
      <SkeletonBlock width={64} height={12} />
      <SkeletonBlock width={hero ? 96 : 56} height={hero ? 40 : 24} radius={hero ? 10 : 6} />
      <SkeletonBlock width="80%" height={11} />
    </View>
  );
}

/** A skeleton shaped like one `<SlotRow>` — mirrors meds-view.tsx's own layout/spacing. */
export function SlotRowSkeleton() {
  const surface = useSurfaceStyle();
  return (
    <View style={[surface, { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three }]}>
      <SkeletonBlock width={14} height={14} radius={7} />
      <View style={{ flex: 1, gap: Spacing.half }}>
        <SkeletonBlock width="55%" height={13} />
        <SkeletonBlock width="35%" height={11} />
      </View>
    </View>
  );
}
