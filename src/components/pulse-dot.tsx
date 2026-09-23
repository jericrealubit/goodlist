import { useEffect } from 'react';
import { View, type AccessibilityProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { EasingBreathe, PulseCycle } from '@/constants/motion';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

type PulseDotProps = {
  color: string;
  /** Diameter in dp. Defaults to the size `stat-tile.tsx`'s dot has always used. */
  size?: number;
  /** 'fill' breathes as a solid mark (stats); 'ring' breathes as a border-only mark (a due dose). */
  variant?: 'fill' | 'ring';
  borderWidth?: number;
  /**
   * Set false to render a fully static mark — no shared value, no worklet,
   * no cost. Callers that only sometimes want motion (e.g. one status out of
   * five) should branch on this rather than always mounting `PulseDot` and
   * hoping the animation doesn't run.
   */
  pulsing?: boolean;
} & Pick<AccessibilityProps, 'accessibilityElementsHidden' | 'importantForAccessibility'>;

/**
 * The one "this is live" mark in the app. Built once so the stats screen's
 * "Live now" dot and a due medicine's ring beathe in the same rhythm instead
 * of each screen inventing its own copy of the loop — which is what
 * `mic-button.tsx` and `voice-sheet.tsx` already did before this existed.
 *
 * Always gated on `useReducedMotion()`: when it's on, or `pulsing` is false,
 * this renders the same plain `View` a static mark always has. The
 * always-on flame in `dev-signature-badge.tsx` is the one place in the app
 * that deliberately ignores that setting; this is not a second one.
 */
export function PulseDot({
  color,
  size = 8,
  variant = 'fill',
  borderWidth = 2,
  pulsing = true,
  accessibilityElementsHidden,
  importantForAccessibility,
}: PulseDotProps) {
  const reducedMotion = useReducedMotion();
  const animate = pulsing && !reducedMotion;

  const base = {
    width: size,
    height: size,
    borderRadius: size / 2,
    ...(variant === 'ring'
      ? { borderWidth, borderColor: color, backgroundColor: 'transparent' }
      : { backgroundColor: color }),
  };

  if (!animate) {
    return (
      <View
        accessibilityElementsHidden={accessibilityElementsHidden}
        importantForAccessibility={importantForAccessibility}
        style={base}
      />
    );
  }

  return (
    <AnimatedMark
      color={color}
      base={base}
      variant={variant}
      accessibilityElementsHidden={accessibilityElementsHidden}
      importantForAccessibility={importantForAccessibility}
    />
  );
}

function AnimatedMark({
  color,
  base,
  variant,
  accessibilityElementsHidden,
  importantForAccessibility,
}: {
  color: string;
  base: object;
  variant: 'fill' | 'ring';
  accessibilityElementsHidden?: boolean;
  importantForAccessibility?: AccessibilityProps['importantForAccessibility'];
}) {
  const beat = useSharedValue(0);

  // Mounted only once `animate` is true above, so this effect's cleanup
  // (implicit — Reanimated cancels a shared value's animation on unmount)
  // is also how the loop stops the instant reduced-motion flips on.
  useEffect(() => {
    beat.value = withRepeat(withTiming(1, { duration: PulseCycle, easing: EasingBreathe }), -1, true);
  }, [beat]);

  const style = useAnimatedStyle(() =>
    variant === 'fill'
      ? { opacity: 0.55 + beat.value * 0.45, transform: [{ scale: 1 + beat.value * 0.15 }] }
      : { opacity: 0.4 + beat.value * 0.6 },
  );

  return (
    <Animated.View
      accessibilityElementsHidden={accessibilityElementsHidden}
      importantForAccessibility={importantForAccessibility}
      style={[base, style, variant === 'ring' && { borderColor: color }]}
    />
  );
}
