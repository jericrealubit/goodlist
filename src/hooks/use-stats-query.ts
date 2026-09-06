import { useQuery } from '@tanstack/react-query';

import { statsKeys } from '@/lib/query-client';
import { getUserStats } from '@/lib/queries/stats';

// Matches the presence heartbeat's cadence (see use-presence-heartbeat), so
// the live count is never more than one beat behind what the server knows.
const REFRESH_INTERVAL_MS = 60_000;

export function useUserStatsQuery() {
  return useQuery({
    queryKey: statsKeys.users,
    queryFn: getUserStats,
    // Community-wide counts are shared state, not this user's data: there is
    // no local mutation that can keep them fresh, so they're polled while the
    // screen is open. react-query pauses the interval while offline.
    refetchInterval: REFRESH_INTERVAL_MS,
    staleTime: REFRESH_INTERVAL_MS,
  });
}
