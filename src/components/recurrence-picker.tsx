import { StyleSheet, View } from 'react-native';

import { DueDatePicker } from '@/components/due-date-picker';
import { OptionPicker } from '@/components/option-picker';
import { ThemedText } from '@/components/themed-text';
import { WeekdayChips } from '@/components/weekday-chips';
import { Spacing } from '@/constants/theme';
import { fromDayKey, toDayKey } from '@/lib/calendar/day';
import { formatTime } from '@/lib/medications/schedule';
import { describeRecurrence, RECURRENCE_FREQUENCIES, type RecurrenceFrequency } from '@/lib/tasks/recurrence';
import type { RecurrenceInput, TaskRecurrence } from '@/lib/types';

export type RepeatChoice = RecurrenceFrequency | 'none';

export type RepeatValue = {
  frequency: RepeatChoice;
  /** Only used for 'custom'. */
  days: number[];
  endDate: Date | null;
};

export const NO_REPEAT: RepeatValue = { frequency: 'none', days: [], endDate: null };

/** A series' saved pattern, as the picker's value. */
export function repeatValueOf(series: Pick<TaskRecurrence, 'frequency' | 'days_of_week' | 'end_date'>): RepeatValue {
  return {
    frequency: series.frequency,
    days: series.days_of_week ?? [],
    endDate: series.end_date ? fromDayKey(series.end_date) : null,
  };
}

/** Why this pattern can't be saved from `start`, or null if it can. */
export function validateRepeat(value: RepeatValue, start: Date): string | null {
  if (value.frequency === 'custom' && value.days.length === 0) return 'Pick at least one day for it to repeat on.';
  if (value.endDate && toDayKey(value.endDate) < toDayKey(start)) return 'The last day can’t be before the first.';
  return null;
}

/**
 * Everything a series needs, from what the editor holds: the first
 * occurrence's day and time come from `dueAt`, so "every week" means every
 * week on the day and at the time already chosen.
 */
export function toRecurrenceInput(fields: {
  title: string;
  notes: string;
  dueAt: Date;
  alarmEnabled: boolean;
  repeat: RepeatValue;
}): RecurrenceInput {
  const { title, notes, dueAt, alarmEnabled, repeat } = fields;
  const frequency = repeat.frequency === 'none' ? 'daily' : repeat.frequency;
  return {
    title,
    notes: notes || null,
    frequency,
    days_of_week: frequency === 'custom' ? repeat.days : null,
    start_date: toDayKey(dueAt),
    due_time: formatTime(dueAt.getHours(), dueAt.getMinutes()),
    end_date: repeat.endDate ? toDayKey(repeat.endDate) : null,
    alarm_enabled: alarmEnabled,
  };
}

/**
 * Doesn't repeat / Every day / Every week / Every 2 weeks / Every month /
 * Choose days — plus the days themselves, and an optional last day.
 *
 * `anchor` is the first occurrence's day; the week, fortnight and month
 * options name it ("Every week on Tuesday") so the choice says exactly what
 * it will do rather than leaving someone to guess which Tuesday counts.
 */
export function RecurrencePicker({
  value,
  onChange,
  anchor,
  allowNone = true,
}: {
  value: RepeatValue;
  onChange: (next: RepeatValue) => void;
  anchor: Date;
  /** False on a series' own editor, where "doesn't repeat" is "Stop repeating" instead. */
  allowNone?: boolean;
}) {
  const start_date = toDayKey(anchor);
  const options = [
    ...(allowNone ? [{ id: 'none', label: 'Doesn’t repeat' }] : []),
    ...RECURRENCE_FREQUENCIES.map((frequency) => ({
      id: frequency,
      label: frequency === 'custom' ? 'Choose days' : describeRecurrence({ frequency, days_of_week: null, start_date }),
    })),
  ];

  function select(id: string) {
    const frequency = id as RepeatChoice;
    // Choosing days starts from the anchor's own weekday, so the first tap
    // already shows a sensible pick rather than an empty row.
    const days = frequency === 'custom' && value.days.length === 0 ? [anchor.getDay()] : value.days;
    onChange({ ...value, frequency, days });
  }

  return (
    <View style={styles.group}>
      <OptionPicker options={options} selectedId={value.frequency} onSelect={select} />
      {value.frequency === 'custom' ? (
        <WeekdayChips value={value.days} onChange={(days) => onChange({ ...value, days })} />
      ) : null}
      {value.frequency !== 'none' ? (
        <View style={styles.group}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            Last day (optional)
          </ThemedText>
          <DueDatePicker
            value={value.endDate}
            onChange={(endDate) => onChange({ ...value, endDate })}
            name="last day"
            placeholder="Keeps going"
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: Spacing.two,
  },
});
