import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTokens } from '@/hooks/use-tokens';
import { ordinal } from '@/lib/tasks/recurrence';

const WEEKS = [
  [1, 2, 3, 4, 5, 6, 7],
  [8, 9, 10, 11, 12, 13, 14],
  [15, 16, 17, 18, 19, 20, 21],
  [22, 23, 24, 25, 26, 27, 28],
  [29, 30, 31],
];

/**
 * Days 1–31 laid out like a month, seven to a row, for picking the one day
 * a monthly task lands on. Styled to match WeekdayChips, so the two monthly
 * pickers read as the same kind of control.
 */
export function MonthDayChips({ value, onChange }: { value: number | null; onChange: (day: number) => void }) {
  const tokens = useTokens();
  return (
    <View style={{ gap: tokens.spacing.one }} accessibilityRole="radiogroup" accessibilityLabel="Day of the month">
      {WEEKS.map((week) => (
        <View key={week[0]} style={[styles.row, { gap: tokens.spacing.one }]}>
          {Array.from({ length: 7 }, (_, i) => {
            const day = week[i];
            if (day === undefined) return <View key={`empty-${i}`} style={styles.chip} />;
            const selected = day === value;
            return (
              <Pressable
                key={day}
                onPress={() => onChange(day)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={`The ${ordinal(day)}`}
                style={({ pressed }) => [styles.chip, pressed && styles.pressed]}>
                <ThemedView
                  type={selected ? 'backgroundSelected' : 'backgroundElement'}
                  style={[styles.chipInner, { borderRadius: tokens.radii.md, paddingVertical: tokens.spacing.two }]}>
                  <ThemedText type={selected ? 'smallBold' : 'small'}>{day}</ThemedText>
                </ThemedView>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
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
