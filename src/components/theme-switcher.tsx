import { OptionPicker } from '@/components/option-picker';
import { THEME_LIST, type ThemeId } from '@/constants/themes';
import { useSelectedTheme } from '@/contexts/theme-context';

export function ThemeSwitcher() {
  const { themeId, setThemeId } = useSelectedTheme();

  return (
    <OptionPicker
      options={THEME_LIST.map((theme) => ({ id: theme.id, label: theme.label, swatches: theme.swatches }))}
      selectedId={themeId}
      onSelect={(id) => setThemeId(id as ThemeId)}
    />
  );
}
