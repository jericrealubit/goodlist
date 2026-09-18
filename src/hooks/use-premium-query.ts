import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { getMyEntitlement } from '@/lib/queries/premium';
import { premiumKeys } from '@/lib/query-client';

const DAY_MS = 1000 * 60 * 60 * 24;
// Longer setTimeout delays overflow and fire at once (e.g. on web).
const MAX_TIMER_MS = 2 ** 31 - 1;

export type PremiumStatus = {
  isPremium: boolean;
  inTrial: boolean;
  trialUsed: boolean;
  trialDaysLeft: number;
  isPaid: boolean;
};

// Postgres timestamps can be 'infinity' / '-infinity' (revenuecat-sync stores
// a non-expiring grant as premium_until = 'infinity'), which Date.parse reads
// as NaN. Map them to ±Infinity so comparisons agree with the database's.
function parseTimestamp(value: string | null | undefined): number {
  if (!value) return 0;
  if (value === 'infinity') return Infinity;
  if (value === '-infinity') return -Infinity;
  return Date.parse(value);
}

export function usePremiumStatus() {
  const query = useQuery({ queryKey: premiumKeys.mine, queryFn: getMyEntitlement });
  const entitlement = query.data;
  // Render can't read the clock, so hold a reading in state: taken on mount,
  // never older than the entitlement it's compared with (a just-started trial
  // counts from its fetch, not from mount), and re-read by the timer below at
  // each moment the status would change.
  const [clock, setClock] = useState(() => Date.now());
  const now = Math.max(clock, query.dataUpdatedAt);
  const trialEnds = parseTimestamp(entitlement?.trial_ends_at);
  const paidUntil = parseTimestamp(entitlement?.premium_until);
  const inTrial = trialEnds > now;
  const isPaid = paidUntil > now;
  const trialDaysLeft = inTrial ? Math.ceil((trialEnds - now) / DAY_MS) : 0;

  // The trial's day count ticking down (its last tick is the trial ending),
  // or the paid period lapsing — whichever comes first. An endless trial never
  // ticks (and Infinity - Infinity would make the timer delay NaN).
  const nextChange = Math.min(
    inTrial && trialEnds !== Infinity ? trialEnds - (trialDaysLeft - 1) * DAY_MS : Infinity,
    isPaid ? paidUntil : Infinity,
  );

  // Keyed on `now` too, so a timer capped by MAX_TIMER_MS re-arms after firing.
  useEffect(() => {
    if (nextChange === Infinity) return;
    const timer = setTimeout(() => setClock(Date.now()), Math.min(nextChange - Date.now(), MAX_TIMER_MS));
    return () => clearTimeout(timer);
  }, [nextChange, now]);

  const status: PremiumStatus = {
    isPremium: inTrial || isPaid,
    inTrial,
    isPaid,
    trialUsed: !!entitlement?.trial_started_at,
    trialDaysLeft,
  };

  return { ...query, status };
}
