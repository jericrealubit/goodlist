import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ActionIcons } from '@/constants/icons';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTokens } from '@/hooks/use-tokens';

export type DueDatePickerProps = {
  value: Date | null;
  onChange: (date: Date | null) => void;
  disabled?: boolean;
};

export function DueDatePicker({ value, onChange, disabled }: DueDatePickerProps) {
  const theme = useTheme();
  const tokens = useTokens();
  const [showDatePicker, setShowDatePicker] = useState(false);

  return (
    <>
      <Pressable
        disabled={disabled}
        onPress={() => setShowDatePicker(true)}
        accessibilityRole="button"
        accessibilityLabel={value ? `Due date, ${value.toLocaleDateString()}` : 'Set due date'}
        style={[
          styles.button,
          {
            borderColor: theme.border,
            backgroundColor: theme.backgroundElement,
            borderWidth: tokens.borderWidth,
            borderRadius: tokens.radii.sm,
          },
        ]}>
        <Ionicons name={ActionIcons.dueDate} size={18} color={theme.textSecondary} />
        <ThemedText>{value ? value.toLocaleDateString() : 'No due date'}</ThemedText>
      </Pressable>
      {value && !disabled ? (
        <Pressable
          onPress={() => onChange(null)}
          accessibilityRole="button"
          accessibilityLabel="Clear due date"
          style={styles.clearRow}>
          <Ionicons name={ActionIcons.clear} size={16} color={theme.danger} />
          <ThemedText type="link" themeColor="danger">
            Clear due date
          </ThemedText>
        </Pressable>
      ) : null}
      {showDatePicker && (
        <DateTimePicker
          value={value ?? new Date()}
          mode="date"
          onChange={(_event, selectedDate) => {
            setShowDatePicker(Platform.OS === 'ios');
            if (selectedDate) onChange(selectedDate);
          }}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  clearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
});
