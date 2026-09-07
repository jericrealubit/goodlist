import { useQuery } from '@tanstack/react-query';

import { distributionKeys } from '@/lib/query-client';
import { getIsAppAdmin, getUserDistribution } from '@/lib/queries/distribution';

export function useIsAdminQuery() {
  return useQuery({
    queryKey: distributionKeys.isAdmin,
    queryFn: getIsAppAdmin,
    // Admin status effectively never changes within a session, and a failure
    // here should quietly mean "not an admin" rather than retry in a loop.
    staleTime: 1000 * 60 * 60,
    retry: false,
  });
}

export function useDistributionQuery(enabled: boolean) {
  return useQuery({
    queryKey: distributionKeys.report,
    queryFn: getUserDistribution,
    enabled,
    retry: false,
  });
}
