import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTokens } from '@/hooks/use-tokens';
import { readableOn } from '@/lib/color';
import { tapLight } from '@/lib/haptics';

type Option = { id: string; label: string; swatches?: string[] };

type OptionPickerProps = {
  options: Option[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  layout?: 'row' | 'column';
};

export function OptionPicker({ options, selectedId, onSelect, layout = 'column' }: OptionPickerProps) {
  const theme = useTheme();
  const tokens = useTokens();
  // Selection has to be obvious at a glance, not a one-shade background
  // shift: the chosen option fills with the theme's primary, keeps the same
  // text size (bolder, never smaller), and gets a checkmark so it doesn't
  // rely on color alone.
  const selectedText = readableOn(theme.primary);
  const borderWidth = Math.max(tokens.borderWidth, 1);
  return (
    <ThemedView style={[styles.container, { gap: tokens.spacing.two }, layout === 'row' && styles.containerRow]}>
      {options.map((option) => {
        const isSelected = option.id === selectedId;
        return (
          <Pressable
            key={option.id}
            onPress={() => {
              if (!isSelected) tapLight();
              onSelect(option.id);
            }}
            accessibilityRole="radio"
            accessibilityState={{ checked: isSelected }}
            accessibilityLabel={option.label}
            style={({ pressed }) => [layout === 'row' && styles.pressedRow, pressed && styles.pressed]}>
            <View
              style={[
                styles.row,
                {
                  padding: tokens.spacing.three,
                  borderRadius: tokens.radii.lg,
                  borderWidth,
                  backgroundColor: isSelected ? theme.primary : theme.backgroundElement,
                  borderColor: isSelected ? theme.primary : theme.border,
                },
                layout === 'row' && styles.rowCentered,
                option.swatches && styles.rowSpaceBetween,
              ]}>
              <View style={[styles.labelRow, { gap: tokens.spacing.one }]}>
                {isSelected ? <Ionicons name="checkmark" size={18} color={selectedText} /> : null}
                <ThemedText
                  style={
                    isSelected ? { color: selectedText, fontWeight: tokens.font.headingWeight } : undefined
                  }>
                  {option.label}
                </ThemedText>
              </View>
              {option.swatches ? (
                <ThemedView
                  style={styles.swatchRow}
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants">
                  {option.swatches.map((color, index) => (
                    <ThemedView
                      key={index}
                      style={[
                        styles.swatchDot,
                        { backgroundColor: color },
                        isSelected && { borderWidth: 1.5, borderColor: selectedText },
                      ]}
                    />
                  ))}
                </ThemedView>
              ) : null}
            </View>
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
  labelRow: {
    flexDirection: 'row',
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
