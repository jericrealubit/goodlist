import { useEffect } from 'react';

import { useSession } from '@/contexts/session-context';
import { identifyPurchaser } from '@/lib/purchases';

// Keys RevenueCat to the Supabase user id, which is what the revenuecat-sync
// function looks subscriptions up by. Re-runs on account switch.
export function usePurchasesIdentity() {
  const { user } = useSession();
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    identifyPurchaser(userId).catch((err) => console.warn('RevenueCat identify failed', err));
  }, [userId]);
}
