import { useQuery } from '@tanstack/react-query';

import { groupKeys } from '@/lib/query-client';
import { getMyGroup } from '@/lib/queries/group';

export function useGroupQuery() {
  return useQuery({ queryKey: groupKeys.mine, queryFn: getMyGroup });
}
