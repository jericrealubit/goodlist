import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/hooks/use-theme';

// Long enough to cover the repaint (and the task grid remounting to re-measure
// its rows), short enough that trying several themes in a row doesn't feel
// gated. The hold is what hides the frame where old spacing and new colors
// briefly coexist.
const FADE_IN = 120;
const HOLD = 90;
const FADE_OUT = 240;

/**
 * A veil in the incoming theme's own background color, faded over the app
 * while a theme switch lands. Without it the repaint reads as the app
 * stuttering; with it, the same work reads as an intentional transition.
 *
 * Deliberately `pointerEvents="none"`: it is reassurance, not a modal. Someone
 * auditioning themes taps through several in a row, and blocking touches for
 * the length of each transition would make the picker feel slower than the
 * jank it is covering.
 */
export function ThemeTransition({ active, onFinish }: { active: boolean; onFinish: () => void }) {
  const theme = useTheme();
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (!active) return;
    opacity.value = withSequence(
      withTiming(1, { duration: FADE_IN }),
      withDelay(
        HOLD,
        withTiming(0, { duration: FADE_OUT }, (finished) => {
          'worklet';
          if (finished) runOnJS(onFinish)();
        }),
      ),
    );
  }, [active, onFinish, opacity]);

  const fade = useAnimatedStyle(() => ({ opacity: opacity.value }));

  if (!active) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, styles.veil, { backgroundColor: theme.background }, fade]}>
      <ActivityIndicator color={theme.primary} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  veil: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
