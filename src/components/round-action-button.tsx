import { Ionicons } from '@expo/vector-icons';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import type { IconName } from '@/constants/icons';
import { SpringPress } from '@/constants/motion';
import { useSelectedTheme } from '@/contexts/theme-context';
import { useTheme } from '@/hooks/use-theme';
import { useTokens } from '@/hooks/use-tokens';
import { tapLight } from '@/lib/haptics';

type RoundActionButtonProps = {
  icon: IconName;
  onPress: () => void;
  accessibilityLabel: string;
  disabled?: boolean;
  loading?: boolean;
};

// Bespoke, hand-picked accents that don't come from the shared theme tokens —
// each is only ever used by the one theme it's named for.
const DARK_NEON_RING = '#22D3EE';
const COLORFUL_3D_SHADE = '#2540A8';
const LAVENDER_GLASS_FALLBACK_FILL = 'rgba(124, 92, 252, 0.75)';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function Glyph({ icon, color, loading }: { icon: IconName; color: string; loading?: boolean }) {
  if (loading) {
    return <ActivityIndicator color={color} size="small" />;
  }
  return <Ionicons name={icon} size={22} color={color} />;
}

/**
 * The round button at the end of the compose bar, in nine themes' worth of
 * shapes: two that fake depth with a solid offset layer, one made of glass,
 * one with a neon ring, one rotated, one inverted, one with organic corners.
 *
 * It exists as its own component because there is more than one of them now —
 * send and microphone — and a second copy of this switch is how two buttons
 * that should look like siblings stop looking like siblings.
 */
export function RoundActionButton({
  icon,
  onPress,
  accessibilityLabel,
  disabled,
  loading,
}: RoundActionButtonProps) {
  const { themeId } = useSelectedTheme();
  const theme = useTheme();
  const tokens = useTokens();

  // paperCollage's static -4deg tilt has to ride in the same animated style
  // as the press scale, not a separate static `transform` — a later object
  // in a style array replaces a `transform` key wholesale rather than
  // merging it, so a static rotate would otherwise vanish the instant this
  // animated style is applied.
  const rotate = themeId === 'paperCollage' ? '-4deg' : undefined;
  // A plain boolean + effect, not a shared value mutated straight from the
  // press handlers — mutating `.value` inside an inline JSX callback trips
  // the React Compiler's immutability check; inside an effect it's the
  // sanctioned escape hatch (same shape `mic-button.tsx` already uses).
  const [pressed, setPressed] = useState(false);
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSpring(pressed ? 0.94 : 1, SpringPress);
  }, [pressed, scale]);

  const pressStyle = useAnimatedStyle(() => ({
    transform: [...(rotate ? [{ rotate }] : []), { scale: scale.value }],
  }));

  // `onPress` fires on press-in below, so the spring above is pure visual
  // feedback after the fact — it never gates or delays the action itself.
  const pressableProps = {
    onPressIn: () => {
      tapLight();
      onPress();
      setPressed(true);
    },
    onPressOut: () => setPressed(false),
    disabled,
    accessibilityRole: 'button' as const,
    accessibilityLabel,
    accessibilityState: { disabled: !!disabled },
  };

  // colorful3d and brutalist both fake depth with a solid offset layer behind
  // the button rather than a native shadow — same trick, different finish
  // (soft rounded "toy" bevel vs. a hard-edged neubrutalist drop shadow).
  if (themeId === 'colorful3d' || themeId === 'brutalist') {
    const radius = tokens.radii.pill;
    const offsetColor = themeId === 'colorful3d' ? COLORFUL_3D_SHADE : theme.text;
    return (
      <View style={styles.doubleLayerContainer}>
        <View style={[styles.offsetLayer, { backgroundColor: offsetColor, borderRadius: radius }]} />
        <AnimatedPressable
          {...pressableProps}
          style={[
            styles.button,
            styles.doubleLayerTop,
            {
              backgroundColor: theme.primary,
              borderRadius: radius,
              borderWidth: tokens.borderWidth,
              borderColor: theme.border,
              opacity: disabled ? 0.4 : 1,
            },
            themeId === 'colorful3d' ? tokens.shadow : null,
            pressStyle,
          ]}>
          <Glyph icon={icon} color="#ffffff" loading={loading} />
        </AnimatedPressable>
      </View>
    );
  }

  if (themeId === 'lavenderGlass') {
    const radius = tokens.radii.pill;
    return (
      <AnimatedPressable
        {...pressableProps}
        style={[styles.button, { opacity: disabled ? 0.4 : 1 }, tokens.shadow, pressStyle]}>
        {isLiquidGlassAvailable() ? (
          <GlassView style={[styles.fill, { borderRadius: radius, borderWidth: tokens.borderWidth, borderColor: theme.border }]}>
            <Glyph icon={icon} color={theme.text} loading={loading} />
          </GlassView>
        ) : (
          <View
            style={[
              styles.fill,
              {
                backgroundColor: LAVENDER_GLASS_FALLBACK_FILL,
                borderRadius: radius,
                borderWidth: tokens.borderWidth,
                borderColor: theme.border,
              },
            ]}>
            <Glyph icon={icon} color="#ffffff" loading={loading} />
          </View>
        )}
      </AnimatedPressable>
    );
  }

  // Every other theme: one shape, driven by that theme's own tokens/colors.
  let radiusStyle: { borderRadius: number } | typeof styles.organicRadius = { borderRadius: tokens.radii.pill };
  let fill = theme.primary;
  let borderColor = theme.border;
  let borderWidth = tokens.borderWidth;
  let glyphColor = '#ffffff';

  switch (themeId) {
    case 'darkNeon':
      borderColor = DARK_NEON_RING;
      borderWidth = 2;
      break;
    case 'swissMonochrome':
      // radii.pill is already 0 for this theme — square falls out naturally.
      break;
    case 'paperCollage':
      // Handled above, alongside the press scale — see the `rotate` comment.
      break;
    case 'darkLuxury':
      fill = theme.backgroundElement;
      borderColor = theme.primary;
      glyphColor = theme.primary;
      break;
    case 'natureZen':
      radiusStyle = styles.organicRadius;
      break;
    default:
      break;
  }

  return (
    <AnimatedPressable
      {...pressableProps}
      style={[
        styles.button,
        radiusStyle,
        {
          backgroundColor: fill,
          borderWidth,
          borderColor,
          opacity: disabled ? 0.4 : 1,
        },
        tokens.shadow,
        pressStyle,
      ]}>
      <Glyph icon={icon} color={glyphColor} loading={loading} />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fill: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doubleLayerContainer: {
    width: 44,
    height: 44,
  },
  offsetLayer: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 40,
    height: 40,
  },
  doubleLayerTop: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  organicRadius: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 10,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 22,
  },
});
