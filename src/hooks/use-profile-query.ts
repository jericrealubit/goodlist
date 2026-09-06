import { useQuery } from '@tanstack/react-query';

import { profileKeys } from '@/lib/query-client';
import { getMyProfile } from '@/lib/queries/profile';

export function useProfileQuery() {
  return useQuery({ queryKey: profileKeys.mine, queryFn: getMyProfile });
}
