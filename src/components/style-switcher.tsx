import { OptionPicker } from '@/components/option-picker';
import { STYLE_LIST, type StyleId } from '@/constants/style-variants';
import { useSelectedStyle } from '@/contexts/theme-context';

export function StyleSwitcher() {
  const { styleId, setStyleId } = useSelectedStyle();

  return (
    <OptionPicker
      options={STYLE_LIST.map((variant) => ({ id: variant.id, label: variant.label }))}
      selectedId={styleId}
      onSelect={(id) => setStyleId(id as StyleId)}
    />
  );
}
