import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ActionIcons } from '@/constants/icons';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTokens } from '@/hooks/use-tokens';
import { withDueTime } from '@/lib/calendar/day';

export type DueDatePickerProps = {
  value: Date | null;
  onChange: (date: Date | null) => void;
  disabled?: boolean;
  /** What the field is, for its button and clear labels. Defaults to "due date". */
  name?: string;
  /** Shown when there is no value. Defaults to "No due date". */
  placeholder?: string;
  /**
   * Also shows a time-of-day control alongside the date. Off by default —
   * most due dates ("Friday") don't need a time, only fields whose exact
   * instant matters (an alarm) do.
   */
  includeTime?: boolean;
};

function withTime(day: Date, source: Date): Date {
  const result = new Date(day);
  result.setHours(source.getHours(), source.getMinutes(), 0, 0);
  return result;
}

export function DueDatePicker({
  value,
  onChange,
  disabled,
  name = 'due date',
  placeholder = 'No due date',
  includeTime,
}: DueDatePickerProps) {
  const theme = useTheme();
  const tokens = useTokens();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const buttonStyle = [
    styles.button,
    {
      borderColor: theme.border,
      backgroundColor: theme.backgroundElement,
      borderWidth: tokens.borderWidth,
      borderRadius: tokens.radii.sm,
    },
  ];

  return (
    <>
      <View style={styles.row}>
        <Pressable
          disabled={disabled}
          onPress={() => setShowDatePicker(true)}
          accessibilityRole="button"
          accessibilityLabel={value ? `${name[0].toUpperCase()}${name.slice(1)}, ${value.toLocaleDateString()}` : `Set ${name}`}
          style={[buttonStyle, styles.flex]}>
          <Ionicons name={ActionIcons.dueDate} size={18} color={theme.textSecondary} />
          <ThemedText>{value ? value.toLocaleDateString() : placeholder}</ThemedText>
        </Pressable>
        {includeTime && value ? (
          <Pressable
            disabled={disabled}
            onPress={() => setShowTimePicker(true)}
            accessibilityRole="button"
            accessibilityLabel={`${name} time, ${value.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`}
            style={buttonStyle}>
            <Ionicons name={ActionIcons.time} size={18} color={theme.textSecondary} />
            <ThemedText>{value.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</ThemedText>
          </Pressable>
        ) : null}
      </View>
      {value && !disabled ? (
        <Pressable
          onPress={() => onChange(null)}
          accessibilityRole="button"
          accessibilityLabel={`Clear ${name}`}
          style={styles.clearRow}>
          <Ionicons name={ActionIcons.clear} size={16} color={theme.danger} />
          <ThemedText type="link" themeColor="danger">
            Clear {name}
          </ThemedText>
        </Pressable>
      ) : null}
      {showDatePicker && (
        <DateTimePicker
          value={value ?? new Date()}
          mode="date"
          onChange={(_event, selectedDate) => {
            setShowDatePicker(Platform.OS === 'ios');
            if (!selectedDate) return;
            // The picker hands back the chosen day already carrying whatever
            // time `value` held (or, with no prior value, the time the
            // picker happened to open) — so only a brand-new pick needs
            // normalising to the default hour. An existing value's time-of-day
            // is left alone, which is what lets it be adjusted separately via
            // the time button above.
            onChange(value ? selectedDate : withDueTime(selectedDate));
          }}
        />
      )}
      {showTimePicker && value && (
        <DateTimePicker
          value={value}
          mode="time"
          onChange={(_event, selectedTime) => {
            setShowTimePicker(Platform.OS === 'ios');
            if (selectedTime) onChange(withTime(value, selectedTime));
          }}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  flex: {
    flex: 1,
  },
  clearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
});
