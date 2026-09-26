import { Pressable, StyleSheet, View } from 'react-native';

import { WEEKDAY_SHORT } from '@/components/meds/dose-format';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useTokens } from '@/hooks/use-tokens';
import { readableOn } from '@/lib/color';

export const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

/**
 * A row of seven toggles, Sun–Sat, for picking which days something happens
 * on. Shared by a medicine's "Some days" and a repeating task's "Choose days",
 * so the two read as the same control. `single` makes it a pick-one row, for
 * "the second Sunday of every month".
 */
export function WeekdayChips({
  value,
  onChange,
  single = false,
}: {
  value: number[];
  onChange: (days: number[]) => void;
  single?: boolean;
}) {
  const theme = useTheme();
  const tokens = useTokens();
  // Same selected treatment as OptionPicker: a primary fill, not a one-shade shift.
  const selectedText = readableOn(theme.primary);
  const borderWidth = Math.max(tokens.borderWidth, 1);

  function toggle(day: number, selected: boolean) {
    if (single) onChange([day]);
    else onChange(selected ? value.filter((d) => d !== day) : [...value, day].sort());
  }

  return (
    <View style={[styles.chips, { gap: tokens.spacing.one }]}>
      {ALL_DAYS.map((day) => {
        const selected = value.includes(day);
        return (
          <Pressable
            key={day}
            onPress={() => toggle(day, selected)}
            accessibilityRole={single ? 'radio' : 'checkbox'}
            accessibilityState={single ? { selected } : { checked: selected }}
            accessibilityLabel={WEEKDAY_SHORT[day]}
            style={({ pressed }) => [styles.chip, pressed && styles.pressed]}>
            <View
              style={[
                styles.chipInner,
                {
                  borderRadius: tokens.radii.md,
                  paddingVertical: tokens.spacing.two,
                  borderWidth,
                  backgroundColor: selected ? theme.primary : theme.backgroundElement,
                  borderColor: selected ? theme.primary : theme.border,
                },
              ]}>
              <ThemedText type={selected ? 'smallBold' : 'small'} style={selected ? { color: selectedText } : undefined}>
                {WEEKDAY_SHORT[day]}
              </ThemedText>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
  },
  chip: {
    flex: 1,
  },
  chipInner: {
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
