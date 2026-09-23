import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Duration, EasingStandard } from '@/constants/motion';
import { useTheme } from '@/hooks/use-theme';

type AdherenceBarProps = {
  /** 0–100. */
  percent: number;
};

const HEIGHT = 6;

/**
 * A slim fill bar beside the weekly adherence figure — reuses
 * `share-breakdown.tsx`'s "a bar is the part-to-whole shape" language rather
 * than a circular ring, since the app already draws that shape elsewhere and
 * doesn't carry an SVG dependency for a true ring.
 *
 * The fill eases to a new width on data change — a one-shot transition, not
 * a loop, the same way `theme-transition.tsx` doesn't need reduced-motion
 * gating for a single settle.
 */
export function AdherenceBar({ percent }: AdherenceBarProps) {
  const theme = useTheme();
  const clamped = Math.max(0, Math.min(100, percent));
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withTiming(clamped, { duration: Duration.slow, easing: EasingStandard });
  }, [clamped, width]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${width.value}%` }));

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
      <Animated.View style={[styles.fill, { backgroundColor: theme.primary }, fillStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: HEIGHT,
    borderRadius: HEIGHT / 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: HEIGHT / 2,
  },
});
