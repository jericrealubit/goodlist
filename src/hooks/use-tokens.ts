import { styleVariants, type StyleTokens } from '@/constants/style-variants';
import { useSelectedStyle } from '@/contexts/theme-context';

/**
 * Returns the active design style's tokens (spacing, radii, surface, font).
 * Colors remain in `useTheme()`; components that need shape/spacing/surface
 * call both.
 */
export function useTokens(): StyleTokens {
  const { styleId } = useSelectedStyle();
  return styleVariants[styleId].tokens;
}
