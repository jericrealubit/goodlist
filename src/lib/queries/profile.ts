import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';

export async function getMyProfile(): Promise<Profile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();

  if (error) throw error;
  return data;
}
