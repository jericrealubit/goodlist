import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTokens } from '@/hooks/use-tokens';

type Option = { id: string; label: string; swatches?: string[] };

type OptionPickerProps = {
  options: Option[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  layout?: 'row' | 'column';
};

export function OptionPicker({ options, selectedId, onSelect, layout = 'column' }: OptionPickerProps) {
  const tokens = useTokens();
  return (
    <ThemedView style={[styles.container, { gap: tokens.spacing.two }, layout === 'row' && styles.containerRow]}>
      {options.map((option) => {
        const isSelected = option.id === selectedId;
        return (
          <Pressable
            key={option.id}
            onPress={() => onSelect(option.id)}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={option.label}
            style={({ pressed }) => [layout === 'row' && styles.pressedRow, pressed && styles.pressed]}>
            <ThemedView
              type={isSelected ? 'backgroundSelected' : 'backgroundElement'}
              style={[
                styles.row,
                { padding: tokens.spacing.three, borderRadius: tokens.radii.lg },
                layout === 'row' && styles.rowCentered,
                option.swatches && styles.rowSpaceBetween,
              ]}>
              <ThemedText type={isSelected ? 'smallBold' : 'default'}>{option.label}</ThemedText>
              {option.swatches ? (
                <ThemedView style={styles.swatchRow}>
                  {option.swatches.map((color, index) => (
                    <ThemedView key={index} style={[styles.swatchDot, { backgroundColor: color }]} />
                  ))}
                </ThemedView>
              ) : null}
            </ThemedView>
          </Pressable>
        );
      })}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {},
  containerRow: {
    flexDirection: 'row',
  },
  pressed: {
    opacity: 0.7,
  },
  pressedRow: {
    flex: 1,
  },
  row: {},
  rowCentered: {
    alignItems: 'center',
  },
  rowSpaceBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  swatchRow: {
    flexDirection: 'row',
    gap: Spacing.half,
    backgroundColor: 'transparent',
  },
  swatchDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
});
