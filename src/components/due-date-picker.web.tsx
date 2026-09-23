import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

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

function toHM(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function withTime(day: Date, hm: string): Date {
  const [h, m] = hm.split(':').map(Number);
  const result = new Date(day);
  result.setHours(h ?? 0, m ?? 0, 0, 0);
  return result;
}

const inputStyle = (theme: ReturnType<typeof useTheme>, tokens: ReturnType<typeof useTokens>, disabled?: boolean) => ({
  color: theme.text,
  backgroundColor: theme.backgroundElement,
  borderColor: theme.border,
  borderWidth: tokens.borderWidth,
  borderStyle: 'solid' as const,
  borderRadius: tokens.radii.sm,
  paddingLeft: Spacing.three,
  paddingRight: Spacing.three,
  paddingTop: Spacing.three,
  paddingBottom: Spacing.three,
  fontSize: 16,
  fontFamily: 'inherit',
  opacity: disabled ? 0.5 : 1,
  boxSizing: 'border-box' as const,
});

export function DueDatePicker({
  value,
  onChange,
  disabled,
  name = 'due date',
  includeTime,
}: DueDatePickerProps) {
  const theme = useTheme();
  const tokens = useTokens();

  return (
    <View style={styles.group}>
      <View style={styles.row}>
        {/* Native browser date input — Expo web renders through react-dom, so a
            DOM <input> is valid here. Themed to match TextField. */}
        <input
          type="date"
          aria-label={name}
          value={value ? toYMD(value) : ''}
          disabled={disabled}
          onChange={(event) => {
            const picked = fromYMD(event.target.value);
            if (!picked) {
              onChange(null);
              return;
            }
            // A date input can never carry time information, so an existing
            // value's time-of-day has to be explicitly re-applied onto the
            // newly picked day — otherwise a time set via the button below
            // would silently reset every time the date changes.
            onChange(value ? withTime(picked, toHM(value)) : withDueTime(picked));
          }}
          style={{ ...inputStyle(theme, tokens, disabled), flex: 1, width: '100%' }}
        />
        {includeTime && value ? (
          <input
            type="time"
            aria-label={`${name} time`}
            value={toHM(value)}
            disabled={disabled}
            onChange={(event) => {
              if (event.target.value) onChange(withTime(value, event.target.value));
            }}
            style={inputStyle(theme, tokens, disabled)}
          />
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
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  clearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
});
