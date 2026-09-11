import { supabase } from '@/lib/supabase';
import type { Entitlement } from '@/lib/types';

export async function getMyEntitlement(): Promise<Entitlement | null> {
  const { data, error } = await supabase
    .from('entitlements')
    .select('user_id, trial_started_at, trial_ends_at, premium_until')
    .maybeSingle();
  if (error) throw error;
  return data;
}
