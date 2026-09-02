import { useEffect } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import * as WebBrowser from 'expo-web-browser';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTokens } from '@/hooks/use-tokens';

const LINKEDIN_URL = 'https://www.linkedin.com/in/jericrealubit';
const SMOKE_DELAYS = [310, 2110, 3910];

export function DevSignatureBadge({ style }: { style?: StyleProp<ViewStyle> } = {}) {
  const theme = useTheme();
  const tokens = useTokens();

  const flame = useSharedValue(1);
  const smoke1 = useSharedValue(0);
  const smoke2 = useSharedValue(0);
  const smoke3 = useSharedValue(0);
  const smokeValues = [smoke1, smoke2, smoke3];

  useEffect(() => {
    // Deliberate always-on decorative exception — never gated behind the
    // OS reduced-motion setting. See dev-signature-badge rule.
    flame.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 450 }),
        withTiming(0.95, { duration: 450 }),
        withTiming(1.05, { duration: 450 }),
        withTiming(1, { duration: 450 }),
      ),
      -1,
      false,
      undefined,
      ReduceMotion.Never,
    );

    smokeValues.forEach((smoke, index) => {
      smoke.value = withDelay(
        SMOKE_DELAYS[index],
        withRepeat(
          withTiming(1, { duration: 5400, easing: Easing.out(Easing.quad) }),
          -1,
          false,
          undefined,
          ReduceMotion.Never,
        ),
        ReduceMotion.Never,
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flameStyle = useAnimatedStyle(() => ({
    transform: [{ scale: flame.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.15 + (flame.value - 0.95) * 1.2,
    transform: [{ scale: flame.value }],
  }));

  const smoke1Style = useAnimatedStyle(() => ({
    opacity: 0.6 * (1 - smoke1.value),
    transform: [{ translateY: -14 * smoke1.value }, { scale: 0.6 + smoke1.value }],
  }));
  const smoke2Style = useAnimatedStyle(() => ({
    opacity: 0.6 * (1 - smoke2.value),
    transform: [{ translateY: -14 * smoke2.value }, { scale: 0.6 + smoke2.value }],
  }));
  const smoke3Style = useAnimatedStyle(() => ({
    opacity: 0.6 * (1 - smoke3.value),
    transform: [{ translateY: -14 * smoke3.value }, { scale: 0.6 + smoke3.value }],
  }));
  const smokeStyles = [smoke1Style, smoke2Style, smoke3Style];

  return (
    <ThemedView
      type="backgroundElement"
      style={[
        styles.pill,
        { borderColor: theme.border, borderWidth: tokens.borderWidth, borderRadius: tokens.radii.pill },
        style,
      ]}>
      <View
        style={styles.iconStage}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants">
        <Animated.View style={[styles.glow, { backgroundColor: theme.accent }, glowStyle]} />
        {smokeStyles.map((smokeAnimatedStyle, index) => (
          <Animated.View
            key={index}
            style={[styles.smoke, { backgroundColor: theme.textSecondary }, smokeAnimatedStyle]}
          />
        ))}
        <Animated.Text style={[styles.flame, flameStyle]}>🔥</Animated.Text>
      </View>

      <ThemedText type="small" themeColor="textSecondary">
        Smoked & Coded by:
      </ThemedText>

      <Pressable
        onPress={() => WebBrowser.openBrowserAsync(LINKEDIN_URL)}
        accessibilityRole="link"
        accessibilityLabel="jeric — LinkedIn profile"
        hitSlop={8}>
        {({ pressed }) => (
          <ThemedText type="smallBold" style={{ color: pressed ? theme.accent : theme.primary }}>
            jeric
          </ThemedText>
        )}
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  iconStage: {
    width: 20,
    height: 24,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  glow: {
    position: 'absolute',
    bottom: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  smoke: {
    position: 'absolute',
    bottom: 12,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  flame: {
    fontSize: 16,
    lineHeight: 18,
  },
});
