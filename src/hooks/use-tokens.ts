import type { StyleTokens } from '@/constants/style-variants';
import { themes } from '@/constants/themes';
import { useSelectedTheme } from '@/contexts/theme-context';

/**
 * Returns the active theme's design tokens (spacing, radii, surface, font).
 * Colors remain in `useTheme()`; components that need shape/spacing/surface
 * call both.
 */
export function useTokens(): StyleTokens {
  const { themeId } = useSelectedTheme();
  return themes[themeId].tokens;
}
