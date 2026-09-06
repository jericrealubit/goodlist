import { Ionicons } from '@expo/vector-icons';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { useSelectedTheme } from '@/contexts/theme-context';
import { useTheme } from '@/hooks/use-theme';
import { useTokens } from '@/hooks/use-tokens';

type SendButtonProps = {
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
};

// Bespoke, hand-picked accents that don't come from the shared theme tokens —
// each is only ever used by the one theme it's named for.
const DARK_NEON_RING = '#22D3EE';
const COLORFUL_3D_SHADE = '#2540A8';
const LAVENDER_GLASS_FALLBACK_FILL = 'rgba(124, 92, 252, 0.75)';

function Glyph({ color, loading }: { color: string; loading?: boolean }) {
  if (loading) {
    return <ActivityIndicator color={color} size="small" />;
  }
  return <Ionicons name="arrow-up" size={22} color={color} />;
}

export function SendButton({ onPress, disabled, loading }: SendButtonProps) {
  const { themeId } = useSelectedTheme();
  const theme = useTheme();
  const tokens = useTokens();

  const pressableProps = {
    onPressIn: onPress,
    disabled,
    accessibilityRole: 'button' as const,
    accessibilityLabel: 'Add task',
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
        <Pressable
          {...pressableProps}
          style={({ pressed }) => [
            styles.button,
            styles.doubleLayerTop,
            {
              backgroundColor: theme.primary,
              borderRadius: radius,
              borderWidth: tokens.borderWidth,
              borderColor: theme.border,
              opacity: disabled ? 0.4 : pressed ? 0.85 : 1,
            },
            themeId === 'colorful3d' ? tokens.shadow : null,
          ]}>
          <Glyph color="#ffffff" loading={loading} />
        </Pressable>
      </View>
    );
  }

  if (themeId === 'lavenderGlass') {
    const radius = tokens.radii.pill;
    return (
      <Pressable
        {...pressableProps}
        style={({ pressed }) => [styles.button, { opacity: disabled ? 0.4 : pressed ? 0.85 : 1 }, tokens.shadow]}>
        {isLiquidGlassAvailable() ? (
          <GlassView style={[styles.fill, { borderRadius: radius, borderWidth: tokens.borderWidth, borderColor: theme.border }]}>
            <Glyph color={theme.text} loading={loading} />
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
            <Glyph color="#ffffff" loading={loading} />
          </View>
        )}
      </Pressable>
    );
  }

  // Every other theme: one shape, driven by that theme's own tokens/colors.
  let radiusStyle: { borderRadius: number } | typeof styles.organicRadius = { borderRadius: tokens.radii.pill };
  let fill = theme.primary;
  let borderColor = theme.border;
  let borderWidth = tokens.borderWidth;
  let glyphColor = '#ffffff';
  let rotate: string | undefined;

  switch (themeId) {
    case 'darkNeon':
      borderColor = DARK_NEON_RING;
      borderWidth = 2;
      break;
    case 'swissMonochrome':
      // radii.pill is already 0 for this theme — square falls out naturally.
      break;
    case 'paperCollage':
      rotate = '-4deg';
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
    <Pressable
      {...pressableProps}
      style={({ pressed }) => [
        styles.button,
        radiusStyle,
        {
          backgroundColor: fill,
          borderWidth,
          borderColor,
          opacity: disabled ? 0.4 : pressed ? 0.85 : 1,
          transform: rotate ? [{ rotate }] : undefined,
        },
        tokens.shadow,
      ]}>
      <Glyph color={glyphColor} loading={loading} />
    </Pressable>
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
