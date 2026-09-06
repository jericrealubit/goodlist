import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';

export async function updateDisplayName(userId: string, displayName: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ display_name: displayName.trim() || null })
    .eq('id', userId)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}
