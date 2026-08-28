import { supabase } from '@/lib/supabase';

export async function createHousehold(name: string): Promise<string> {
  const { data, error } = await supabase.rpc('create_household', { p_name: name.trim() });
  if (error) throw error;
  return data as string;
}

export async function joinHousehold(inviteCode: string): Promise<string> {
  const { data, error } = await supabase.rpc('join_household', {
    p_invite_code: inviteCode.trim(),
  });
  if (error) throw error;
  return data as string;
}
