import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTokens } from '@/hooks/use-tokens';

export type DueDatePickerProps = {
  value: Date | null;
  onChange: (date: Date | null) => void;
  disabled?: boolean;
};

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

// Local Y-M-D (not toISOString) so the displayed/selected day never shifts by a
// timezone offset.
function toYMD(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function fromYMD(value: string): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

export function DueDatePicker({ value, onChange, disabled }: DueDatePickerProps) {
  const theme = useTheme();
  const tokens = useTokens();

  return (
    <View style={styles.group}>
      {/* Native browser date input — Expo web renders through react-dom, so a
          DOM <input> is valid here. Themed to match TextField. */}
      <input
        type="date"
        value={value ? toYMD(value) : ''}
        disabled={disabled}
        onChange={(event) => onChange(fromYMD(event.target.value))}
        style={{
          color: theme.text,
          backgroundColor: theme.backgroundElement,
          borderColor: theme.border,
          borderWidth: tokens.borderWidth,
          borderStyle: 'solid',
          borderRadius: tokens.radii.sm,
          paddingLeft: Spacing.three,
          paddingRight: Spacing.three,
          paddingTop: Spacing.three,
          paddingBottom: Spacing.three,
          fontSize: 16,
          fontFamily: 'inherit',
          opacity: disabled ? 0.5 : 1,
          width: '100%',
          boxSizing: 'border-box',
        }}
      />
      {value && !disabled ? (
        <Pressable onPress={() => onChange(null)}>
          <ThemedText type="link" themeColor="danger">
            Clear due date
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: Spacing.two,
  },
});
