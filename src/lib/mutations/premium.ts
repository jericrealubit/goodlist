import { supabase } from '@/lib/supabase';

// Asks the revenuecat-sync edge function to pull the caller's subscription
// from RevenueCat into `entitlements` right away, instead of waiting for the
// webhook — so a purchase unlocks the group the moment it completes.
export async function syncPremium(): Promise<void> {
  const { error } = await supabase.functions.invoke('revenuecat-sync', { method: 'POST' });
  if (error) throw error;
}
