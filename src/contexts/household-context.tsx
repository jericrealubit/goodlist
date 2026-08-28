import { createContext, useCallback, useContext, useEffect, useState, type PropsWithChildren } from 'react';

import { getMyHousehold } from '@/lib/queries/household';
import type { HouseholdSummary } from '@/lib/types';

type HouseholdContextValue = {
  household: HouseholdSummary | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
};

const HouseholdContext = createContext<HouseholdContextValue | null>(null);

export function HouseholdProvider({ children }: PropsWithChildren) {
  const [household, setHousehold] = useState<HouseholdSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const data = await getMyHousehold();
    setHousehold(data);
  }, []);

  useEffect(() => {
    refresh().finally(() => setIsLoading(false));
  }, [refresh]);

  return (
    <HouseholdContext.Provider value={{ household, isLoading, refresh }}>{children}</HouseholdContext.Provider>
  );
}

export function useHousehold() {
  const context = useContext(HouseholdContext);
  if (!context) {
    throw new Error('useHousehold must be used within a HouseholdProvider');
  }
  return context;
}
