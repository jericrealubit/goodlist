import type { SlotStatus } from '@/lib/medications/adherence';
import { parseTime } from '@/lib/medications/schedule';
import type { Medication } from '@/lib/types';

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** `HH:MM` in the device's own clock style — "8:00 AM" or "08:00". */
export function formatSlotTime(time: string): string {
  const parsed = parseTime(time);
  if (!parsed) return time;
  return new Date(2000, 0, 1, parsed.hour, parsed.minute).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function describeDays(days: number[] | null): string {
  if (!days || days.length === 7) return 'Every day';
  const sorted = [...days].sort();
  if (sorted.join() === '1,2,3,4,5') return 'Weekdays';
  if (sorted.join() === '0,6') return 'Weekends';
  return sorted.map((d) => WEEKDAY_SHORT[d]).join(', ');
}

export function describeSchedule(med: Pick<Medication, 'times' | 'days_of_week'>): string {
  return `${describeDays(med.days_of_week)} · ${med.times.map(formatSlotTime).join(', ')}`;
}

export const STATUS_LABEL: Record<SlotStatus, string> = {
  taken: 'Taken',
  skipped: 'Skipped',
  missed: 'Missed',
  due: 'Due now',
  upcoming: 'Upcoming',
};

export { WEEKDAY_SHORT };
