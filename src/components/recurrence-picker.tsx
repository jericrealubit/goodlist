import { StyleSheet, View } from 'react-native';

import { DueDatePicker } from '@/components/due-date-picker';
import { MonthDayChips } from '@/components/month-day-chips';
import { OptionPicker } from '@/components/option-picker';
import { ThemedText } from '@/components/themed-text';
import { WeekdayChips } from '@/components/weekday-chips';
import { Spacing } from '@/constants/theme';
import { fromDayKey, toDayKey } from '@/lib/calendar/day';
import { formatTime } from '@/lib/medications/schedule';
import {
  describeRecurrence,
  LAST_WEEK,
  nextOccurrence,
  RECURRENCE_FREQUENCIES,
  weekOfMonth,
  type RecurrenceFrequency,
} from '@/lib/tasks/recurrence';
import type { RecurrenceInput, TaskRecurrence } from '@/lib/types';

/**
 * A frequency, or 'none', or 'monthly_chosen': the picker's own "Choose a day
 * each month", which saves as 'monthly' or 'monthly_weekday' with the day
 * spelled out rather than taken from the first occurrence.
 */
export type RepeatChoice = RecurrenceFrequency | 'none' | 'monthly_chosen';

export type RepeatValue = {
  frequency: RepeatChoice;
  /** Only used for 'custom'. */
  days: number[];
  /** The rest are only used for 'monthly_chosen'. */
  monthBy: 'date' | 'weekday';
  /** 1–31. */
  monthDay: number;
  /** 1–4, or LAST_WEEK. */
  monthWeek: number;
  /** 0 = Sunday … 6 = Saturday. */
  monthWeekday: number;
  endDate: Date | null;
};

export const NO_REPEAT: RepeatValue = {
  frequency: 'none',
  days: [],
  monthBy: 'date',
  monthDay: 1,
  monthWeek: 1,
  monthWeekday: 0,
  endDate: null,
};

/** The monthly choices as `anchor` would have them, so "Choose a day each month" opens on it. */
function monthlyFrom(anchor: Date): Pick<RepeatValue, 'monthDay' | 'monthWeek' | 'monthWeekday'> {
  return { monthDay: anchor.getDate(), monthWeek: weekOfMonth(anchor), monthWeekday: anchor.getDay() };
}

/** A series' saved pattern, as the picker's value. */
export function repeatValueOf(
  series: Pick<TaskRecurrence, 'frequency' | 'days_of_week' | 'month_day' | 'month_week' | 'start_date' | 'end_date'>,
): RepeatValue {
  const start = fromDayKey(series.start_date) ?? new Date();
  const base: RepeatValue = {
    ...NO_REPEAT,
    ...monthlyFrom(start),
    frequency: series.frequency,
    days: series.days_of_week ?? [],
    endDate: series.end_date ? fromDayKey(series.end_date) : null,
  };
  // A spelled-out day belongs to "Choose a day each month"; without one, the
  // series follows its start date and shows as the matching quick option.
  if (series.frequency === 'monthly' && series.month_day) {
    return { ...base, frequency: 'monthly_chosen', monthBy: 'date', monthDay: series.month_day };
  }
  if (series.frequency === 'monthly_weekday' && series.month_week) {
    return {
      ...base,
      frequency: 'monthly_chosen',
      monthBy: 'weekday',
      monthWeek: series.month_week,
      monthWeekday: series.days_of_week?.[0] ?? start.getDay(),
      days: [],
    };
  }
  return base;
}

/** Why this pattern can't be saved from `start`, or null if it can. */
export function validateRepeat(value: RepeatValue, start: Date): string | null {
  if (value.frequency === 'custom' && value.days.length === 0) return 'Pick at least one day for it to repeat on.';
  if (value.endDate && toDayKey(value.endDate) < toDayKey(start)) return 'The last day can’t be before the first.';
  return null;
}

/** The frequency and day fields a picker value saves as. */
function patternOf(repeat: RepeatValue): Pick<RecurrenceInput, 'frequency' | 'days_of_week' | 'month_day' | 'month_week'> {
  switch (repeat.frequency) {
    case 'none':
      return { frequency: 'daily', days_of_week: null, month_day: null, month_week: null };
    case 'custom':
      return { frequency: 'custom', days_of_week: repeat.days, month_day: null, month_week: null };
    case 'monthly_chosen':
      return repeat.monthBy === 'date'
        ? { frequency: 'monthly', days_of_week: null, month_day: repeat.monthDay, month_week: null }
        : {
            frequency: 'monthly_weekday',
            days_of_week: [repeat.monthWeekday],
            month_day: null,
            month_week: repeat.monthWeek,
          };
    default:
      return { frequency: repeat.frequency, days_of_week: null, month_day: null, month_week: null };
  }
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
  return {
    title,
    notes: notes || null,
    ...patternOf(repeat),
    start_date: toDayKey(dueAt),
    due_time: formatTime(dueAt.getHours(), dueAt.getMinutes()),
    end_date: repeat.endDate ? toDayKey(repeat.endDate) : null,
    alarm_enabled: alarmEnabled,
  };
}

const MONTH_BY_OPTIONS = [
  { id: 'date', label: 'A date' },
  { id: 'weekday', label: 'A weekday' },
];

const WEEK_OPTIONS = [
  { id: '1', label: '1st' },
  { id: '2', label: '2nd' },
  { id: '3', label: '3rd' },
  { id: '4', label: '4th' },
  { id: String(LAST_WEEK), label: 'Last' },
];

/**
 * Doesn't repeat / Every day / Every week / Every 2 weeks / Every month on
 * the 11th / Every month on the second Sunday / Choose days of the week /
 * Choose a day each month — plus the days themselves, and an optional last
 * day.
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
      label:
        frequency === 'custom'
          ? 'Choose days of the week'
          : describeRecurrence({ frequency, days_of_week: null, start_date }),
    })),
    { id: 'monthly_chosen', label: 'Choose a day each month' },
  ];

  function select(id: string) {
    const frequency = id as RepeatChoice;
    // Choosing days starts from the anchor's own weekday, and choosing a
    // monthly day from the anchor's own date, so the first tap already shows
    // a sensible pick rather than an empty control.
    const days = frequency === 'custom' && value.days.length === 0 ? [anchor.getDay()] : value.days;
    const monthly = frequency === 'monthly_chosen' && value.frequency !== 'monthly_chosen' ? monthlyFrom(anchor) : {};
    onChange({ ...value, frequency, days, ...monthly });
  }

  // Where a chosen monthly day first lands, since it may not be the anchor's.
  const nextKey =
    value.frequency === 'monthly_chosen'
      ? nextOccurrence(
          { ...patternOf(value), start_date, end_date: null, skipped_dates: [], active: true },
          start_date,
        )
      : null;
  const next = nextKey ? fromDayKey(nextKey) : null;

  return (
    <View style={styles.group}>
      <OptionPicker options={options} selectedId={value.frequency} onSelect={select} />
      {value.frequency === 'custom' ? (
        <WeekdayChips value={value.days} onChange={(days) => onChange({ ...value, days })} />
      ) : null}
      {value.frequency === 'monthly_chosen' ? (
        <View style={styles.group}>
          <OptionPicker
            layout="row"
            options={MONTH_BY_OPTIONS}
            selectedId={value.monthBy}
            onSelect={(id) => onChange({ ...value, monthBy: id as RepeatValue['monthBy'] })}
          />
          {value.monthBy === 'date' ? (
            <MonthDayChips value={value.monthDay} onChange={(monthDay) => onChange({ ...value, monthDay })} />
          ) : (
            <>
              <OptionPicker
                layout="row"
                options={WEEK_OPTIONS}
                selectedId={String(value.monthWeek)}
                onSelect={(id) => onChange({ ...value, monthWeek: Number(id) })}
              />
              <WeekdayChips
                single
                value={[value.monthWeekday]}
                onChange={([monthWeekday]) => onChange({ ...value, monthWeekday })}
              />
            </>
          )}
          <ThemedText type="small" themeColor="textSecondary">
            {describeRecurrence({ ...patternOf(value), start_date })}
            {value.monthBy === 'date' && value.monthDay > 28 ? ' — or the month’s last day, if it’s shorter' : ''}.
            {next ? ` Next: ${next.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}.` : ''}
          </ThemedText>
        </View>
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
