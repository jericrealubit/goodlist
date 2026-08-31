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

export async function renameGroup(name: string): Promise<void> {
  const { error } = await supabase.rpc('rename_household', { p_name: name.trim() });
  if (error) throw error;
}

export async function leaveGroup(): Promise<void> {
  const { error } = await supabase.rpc('leave_household');
  if (error) throw error;
}

export async function removeGroupMember(userId: string): Promise<void> {
  const { error } = await supabase.rpc('remove_household_member', { p_user_id: userId });
  if (error) throw error;
}

export async function transferGroupOwnership(newOwnerId: string): Promise<void> {
  const { error } = await supabase.rpc('transfer_household_ownership', { p_new_owner_id: newOwnerId });
  if (error) throw error;
}
