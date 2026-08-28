import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';

export async function updateDisplayName(displayName: string): Promise<Profile> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in.');

  const { data, error } = await supabase
    .from('profiles')
    .update({ display_name: displayName.trim() || null })
    .eq('id', user.id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}
