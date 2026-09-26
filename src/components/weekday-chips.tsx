import { Pressable, StyleSheet, View } from 'react-native';

import { WEEKDAY_SHORT } from '@/components/meds/dose-format';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTokens } from '@/hooks/use-tokens';

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
  const tokens = useTokens();

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
            <ThemedView
              type={selected ? 'backgroundSelected' : 'backgroundElement'}
              style={[styles.chipInner, { borderRadius: tokens.radii.md, paddingVertical: tokens.spacing.two }]}>
              <ThemedText type={selected ? 'smallBold' : 'small'}>{WEEKDAY_SHORT[day]}</ThemedText>
            </ThemedView>
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
