import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTokens } from '@/hooks/use-tokens';
import { parseTime } from '@/lib/medications/schedule';

export type TimePickerProps = {
  /** `HH:MM`, 24-hour. */
  value: string;
  onChange: (value: string) => void;
  accessibilityLabel: string;
};

// A native browser <input type="time">, themed like the web date picker. Its
// value is already `HH:MM` in 24-hour form whatever the browser displays.
export function TimePicker({ value, onChange, accessibilityLabel }: TimePickerProps) {
  const theme = useTheme();
  const tokens = useTokens();

  return (
    <input
      type="time"
      aria-label={accessibilityLabel}
      value={value}
      onChange={(event) => {
        if (parseTime(event.target.value)) onChange(event.target.value);
      }}
      style={{
        flex: 1,
        color: theme.text,
        backgroundColor: theme.backgroundElement,
        borderColor: theme.border,
        borderWidth: tokens.borderWidth,
        borderStyle: 'solid',
        borderRadius: tokens.radii.sm,
        padding: Spacing.three,
        fontSize: 16,
        fontFamily: 'inherit',
        minWidth: 0,
        boxSizing: 'border-box',
      }}
    />
  );
}
