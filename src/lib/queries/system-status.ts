import { supabase } from '@/lib/supabase';
import type { SystemStatus } from '@/lib/types';

// `maybeSingle` (not `single`) so a table that hasn't been seeded yet (see
// docs/system-status-notice.md) resolves to null instead of throwing — the
// banner should fail soft, not surface an error, if the row is missing.
export async function getSystemStatus(): Promise<SystemStatus | null> {
  const { data, error } = await supabase
    .from('system_status')
    .select('message, updated_at')
    .eq('id', true)
    .maybeSingle();
  if (error) throw error;
  return data;
}
