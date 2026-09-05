import { themes } from '@/constants/themes';
import { useSelectedTheme } from '@/contexts/theme-context';

export function useTheme() {
  const { themeId } = useSelectedTheme();
  return themes[themeId].colors;
}
