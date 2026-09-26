import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTokens } from '@/hooks/use-tokens';
import { mixHex, readableOn, strengthenOn } from '@/lib/color';
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
  // Selection has to be obvious at a glance without costing readability.
  // A solid primary fill put body text on mid-tone greens and terracottas
  // (~5:1 at best) and hid the first swatch, so the chosen option instead
  // gets a light primary tint, a thicker primary outline, a filled check
  // badge, and bold text in the theme's own text color (9.6:1+ on every
  // theme). The badge means selection never relies on color alone.
  const selectedSurface = mixHex(theme.primary, theme.backgroundElement, 0.86);
  const selectedOutline = strengthenOn(theme.primary, selectedSurface, theme.text);
  const badgeIcon = readableOn(selectedOutline);
  // A hairline ring keeps pale swatches (off-white, lavender) visible on
  // white cards.
  const swatchRing = mixHex(theme.text, theme.backgroundElement, 0.8);
  const borderWidth = Math.max(tokens.borderWidth, 1);
  const selectedBorderWidth = 2;
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
                  // Shrink padding by the extra border so selecting doesn't
                  // shift the label.
                  padding: tokens.spacing.three - (isSelected ? selectedBorderWidth - borderWidth : 0),
                  borderRadius: tokens.radii.lg,
                  borderWidth: isSelected ? selectedBorderWidth : borderWidth,
                  backgroundColor: isSelected ? selectedSurface : theme.backgroundElement,
                  borderColor: isSelected ? selectedOutline : theme.border,
                },
                layout === 'row' && styles.rowCentered,
                option.swatches && styles.rowSpaceBetween,
              ]}>
              <View style={[styles.labelRow, { gap: tokens.spacing.two }]}>
                {isSelected ? (
                  <View style={[styles.checkBadge, { backgroundColor: selectedOutline }]}>
                    <Ionicons name="checkmark" size={14} color={badgeIcon} />
                  </View>
                ) : null}
                <ThemedText style={isSelected ? { fontWeight: tokens.font.headingWeight } : undefined}>
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
                        { backgroundColor: color, borderColor: swatchRing },
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
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  checkBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
