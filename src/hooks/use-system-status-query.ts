import { useQuery } from '@tanstack/react-query';

import { systemStatusKeys } from '@/lib/query-client';
import { getSystemStatus } from '@/lib/queries/system-status';

// A maintenance notice tolerates staleness, and this feature exists to warn
// about Supabase usage pressure — polling it aggressively would work against
// its own purpose. react-query pauses the interval while offline.
const REFRESH_INTERVAL_MS = 5 * 60_000;

export function useSystemStatusQuery() {
  return useQuery({
    queryKey: systemStatusKeys.current,
    queryFn: getSystemStatus,
    refetchInterval: REFRESH_INTERVAL_MS,
    staleTime: REFRESH_INTERVAL_MS,
    // Deliberately no `enabled: !!user` — signed-out users on the (auth)
    // stack need to see notices too (e.g. Supabase capacity affecting
    // sign-in itself).
  });
}
