import { supabase } from '@/lib/supabase';

// Stamps the caller's profile with the server's clock. Fire-and-forget: a
// failed heartbeat only means this user drops out of the live count until the
// next one lands, so callers swallow the error rather than surfacing it.
export async function touchLastSeen(): Promise<void> {
  const { error } = await supabase.rpc('touch_last_seen');
  if (error) throw error;
}
