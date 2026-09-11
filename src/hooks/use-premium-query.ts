import { useQuery } from '@tanstack/react-query';

import { getMyEntitlement } from '@/lib/queries/premium';
import { premiumKeys } from '@/lib/query-client';

const DAY_MS = 1000 * 60 * 60 * 24;

export type PremiumStatus = {
  isPremium: boolean;
  inTrial: boolean;
  trialUsed: boolean;
  trialDaysLeft: number;
  isPaid: boolean;
};

export function usePremiumStatus() {
  const query = useQuery({ queryKey: premiumKeys.mine, queryFn: getMyEntitlement });
  const entitlement = query.data;
  const now = Date.now();
  const trialEnds = entitlement?.trial_ends_at ? Date.parse(entitlement.trial_ends_at) : 0;
  const paidUntil = entitlement?.premium_until ? Date.parse(entitlement.premium_until) : 0;
  const inTrial = trialEnds > now;
  const isPaid = paidUntil > now;

  const status: PremiumStatus = {
    isPremium: inTrial || isPaid,
    inTrial,
    isPaid,
    trialUsed: !!entitlement?.trial_started_at,
    trialDaysLeft: inTrial ? Math.ceil((trialEnds - now) / DAY_MS) : 0,
  };

  return { ...query, status };
}
