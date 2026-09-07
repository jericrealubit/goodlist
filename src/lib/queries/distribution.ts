import { supabase } from '@/lib/supabase';
import type { DistributionRow } from '@/lib/types';

/**
 * Whether the signed-in user is on the admin allowlist. The underlying SQL
 * function only ever reports on the caller, so this is safe for anyone to ask.
 */
export async function getIsAppAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_app_admin');
  if (error) throw error;
  return data === true;
}

/**
 * Aggregated user counts by country / region / city. The RPC raises
 * "Not authorized." for non-admins — the real gate, independent of whether the
 * Settings entry is rendered.
 */
export async function getUserDistribution(): Promise<DistributionRow[]> {
  const { data, error } = await supabase.rpc('user_distribution_report');
  if (error) throw error;
  return (data ?? []) as DistributionRow[];
}
