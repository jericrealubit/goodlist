import { supabase } from '@/lib/supabase';

// Asks the revenuecat-sync edge function to pull the caller's subscription
// from RevenueCat into `entitlements` right away, instead of waiting for the
// webhook — so a purchase unlocks the group the moment it completes.
export async function syncPremium(): Promise<void> {
  const { error } = await supabase.functions.invoke('revenuecat-sync', { method: 'POST' });
  if (error) throw error;
}

// Starts the caller's one-per-account 90-day trial, if they haven't had one
// yet — a no-op otherwise. The database grants this same trial on its own the
// moment a second group or a shared medicine actually goes through
// (start_premium_trial_if_unused), so this is only needed to make the
// "Start your free trial" link elsewhere feel immediate rather than waiting
// for a retried save.
export async function startPremiumTrial(): Promise<void> {
  const { error } = await supabase.rpc('start_premium_trial');
  if (error) throw error;
}
