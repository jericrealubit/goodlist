import { useQuery } from '@tanstack/react-query';

import { groupKeys } from '@/lib/query-client';
import { getMyGroups } from '@/lib/queries/group';

export function useGroupsQuery() {
  return useQuery({ queryKey: groupKeys.mine, queryFn: getMyGroups });
}
