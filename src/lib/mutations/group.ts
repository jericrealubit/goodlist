import { supabase } from '@/lib/supabase';
import type { GroupMode, MemberRole } from '@/lib/types';

export async function createGroup(
  name: string,
  mode: GroupMode,
  memberRole: MemberRole | null,
): Promise<string> {
  const { data, error } = await supabase.rpc('create_household', {
    p_name: name.trim(),
    p_mode: mode,
    p_member_role: memberRole,
  });
  if (error) throw error;
  return data as string;
}

export async function joinGroup(inviteCode: string, memberRole: MemberRole | null): Promise<string> {
  const { data, error } = await supabase.rpc('join_household', {
    p_invite_code: inviteCode.trim(),
    p_member_role: memberRole,
  });
  if (error) throw error;
  return data as string;
}
