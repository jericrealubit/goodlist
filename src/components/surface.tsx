import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { View, type ViewProps, type ViewStyle } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { useTokens } from '@/hooks/use-tokens';

type RadiusKey = 'sm' | 'md' | 'lg' | 'pill';

/**
 * Returns the active design style's card treatment (fill, border, radius, and
 * elevation) as a style object. Use directly when a card can't easily be
 * wrapped in <Surface> (e.g. inside a `.map`), otherwise prefer <Surface>.
 * This is the solid treatment; the translucent 'glass' effect is only rendered
 * by the <Surface> component (on supported iOS builds), so hook consumers get
 * the solid fallback.
 */
export function useSurfaceStyle(radius: RadiusKey = 'lg'): ViewStyle {
  const theme = useTheme();
  const tokens = useTokens();
  const hasShadow = tokens.surface === 'elevated' || tokens.surface === 'glass';
  return {
    backgroundColor: theme.backgroundElement,
    borderRadius: tokens.radii[radius],
    borderWidth: tokens.cardBorderWidth,
    borderColor: theme.border,
    ...(hasShadow ? tokens.shadow : null),
  };
}

type SurfaceProps = ViewProps & {
  radius?: RadiusKey;
};

/**
 * A themed card surface whose treatment is driven by the active design style.
 * Use in place of `<ThemedView type="backgroundElement" style={{ borderRadius,
 * ... }}>` for anything that should read as a raised/bordered card.
 *
 * For the 'glass' style on a supported iOS build, renders a native translucent
 * GlassView; everywhere else it falls back to the solid treatment above.
 */
export function Surface({ radius = 'lg', style, ...rest }: SurfaceProps) {
  const theme = useTheme();
  const tokens = useTokens();
  const surfaceStyle = useSurfaceStyle(radius);

  if (tokens.surface === 'glass' && isLiquidGlassAvailable()) {
    return (
      <GlassView
        style={[
          {
            borderRadius: tokens.radii[radius],
            borderWidth: tokens.cardBorderWidth,
            borderColor: theme.border,
          },
          style,
        ]}
        {...rest}
      />
    );
  }

  return <View style={[surfaceStyle, style]} {...rest} />;
}
