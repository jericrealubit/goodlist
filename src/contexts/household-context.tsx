import { createContext, useCallback, useContext, useEffect, useState, type PropsWithChildren } from 'react';

import { getErrorMessage } from '@/lib/errors';
import { getMyHousehold } from '@/lib/queries/household';
import type { HouseholdSummary } from '@/lib/types';

type HouseholdContextValue = {
  household: HouseholdSummary | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const HouseholdContext = createContext<HouseholdContextValue | null>(null);

export function HouseholdProvider({ children }: PropsWithChildren) {
  const [household, setHousehold] = useState<HouseholdSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      setHousehold(await getMyHousehold());
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load your household.'));
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setIsLoading(false));
  }, [refresh]);

  return (
    <HouseholdContext.Provider value={{ household, isLoading, error, refresh }}>
      {children}
    </HouseholdContext.Provider>
  );
}

export function useHousehold() {
  const context = useContext(HouseholdContext);
  if (!context) {
    throw new Error('useHousehold must be used within a HouseholdProvider');
  }
  return context;
}
