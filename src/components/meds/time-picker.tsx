import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet } from 'react-native';

import { formatSlotTime } from '@/components/meds/dose-format';
import { ThemedText } from '@/components/themed-text';
import { ActionIcons } from '@/constants/icons';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTokens } from '@/hooks/use-tokens';
import { formatTime, parseTime } from '@/lib/medications/schedule';

export type TimePickerProps = {
  /** `HH:MM`, 24-hour. */
  value: string;
  onChange: (value: string) => void;
  accessibilityLabel: string;
};

export function TimePicker({ value, onChange, accessibilityLabel }: TimePickerProps) {
  const theme = useTheme();
  const tokens = useTokens();
  const [open, setOpen] = useState(false);
  const parsed = parseTime(value) ?? { hour: 8, minute: 0 };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${accessibilityLabel}, ${formatSlotTime(value)}`}
        style={[
          styles.button,
          {
            borderColor: theme.border,
            backgroundColor: theme.backgroundElement,
            borderWidth: tokens.borderWidth,
            borderRadius: tokens.radii.sm,
          },
        ]}>
        <Ionicons name={ActionIcons.time} size={18} color={theme.textSecondary} />
        <ThemedText>{formatSlotTime(value)}</ThemedText>
      </Pressable>
      {open ? (
        <DateTimePicker
          value={new Date(2000, 0, 1, parsed.hour, parsed.minute)}
          mode="time"
          onChange={(_event, selected) => {
            setOpen(Platform.OS === 'ios');
            if (selected) onChange(formatTime(selected.getHours(), selected.getMinutes()));
          }}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
});
