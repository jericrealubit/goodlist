import { themes } from '@/constants/themes';
import { useSelectedTheme } from '@/contexts/theme-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useTheme() {
  const scheme = useColorScheme();
  const { themeId } = useSelectedTheme();
  const mode = scheme === 'unspecified' ? 'light' : (scheme ?? 'light');
  return themes[themeId].tokens[mode];
}
