import { CalendarView } from '@/components/calendar/calendar-view';
import { useTabScreenInsets } from '@/hooks/use-tab-screen-insets';

/**
 * Thin on purpose: the calendar lives in `CalendarView`, so where it is placed
 * stays a one-file decision. `useTabScreenInsets` rather than raw safe-area
 * insets — it adds the web top nav and the native tab bar's own height.
 */
export default function CalendarScreen() {
  const { topInset, bottomInset } = useTabScreenInsets();
  return <CalendarView topInset={topInset} bottomInset={bottomInset} />;
}
