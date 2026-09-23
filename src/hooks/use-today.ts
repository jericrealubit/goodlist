import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { toDayKey, type DayKey } from '@/lib/calendar/day';

/**
 * Today's local day key, kept current. Render can't read the clock (the React
 * Compiler rules), so the reading lives in state and is refreshed each minute
 * and whenever the app comes forward — which is what rolls "today" over at
 * midnight, and after a phone has sat in a drawer overnight.
 *
 * Only changes when the day does, so a screen keyed on it re-renders once a
 * day, not once a minute.
 */
export function useToday(): DayKey {
  const [today, setToday] = useState(() => toDayKey(new Date()));

  useEffect(() => {
    const refresh = () => setToday(toDayKey(new Date()));
    const timer = setInterval(refresh, 60_000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, []);

  return today;
}
