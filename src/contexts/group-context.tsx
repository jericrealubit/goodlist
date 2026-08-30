import { createContext, useCallback, useContext, useEffect, useState, type PropsWithChildren } from 'react';

import { getErrorMessage } from '@/lib/errors';
import { getMyGroup } from '@/lib/queries/group';
import type { GroupSummary } from '@/lib/types';

type GroupContextValue = {
  group: GroupSummary | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const GroupContext = createContext<GroupContextValue | null>(null);

export function GroupProvider({ children }: PropsWithChildren) {
  const [group, setGroup] = useState<GroupSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      setGroup(await getMyGroup());
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load your group.'));
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setIsLoading(false));
  }, [refresh]);

  return <GroupContext.Provider value={{ group, isLoading, error, refresh }}>{children}</GroupContext.Provider>;
}

export function useGroup() {
  const context = useContext(GroupContext);
  if (!context) {
    throw new Error('useGroup must be used within a GroupProvider');
  }
  return context;
}
