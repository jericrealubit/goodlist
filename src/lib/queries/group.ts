import { supabase } from '@/lib/supabase';
import type { Group, GroupMember, GroupMode, GroupSummary } from '@/lib/types';

export async function getMyGroup(): Promise<GroupSummary | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: membership, error: membershipError } = await supabase
    .from('family_members')
    .select('family_id, role, families(*)')
    .eq('user_id', user.id)
    .maybeSingle();

  if (membershipError) throw membershipError;
  if (!membership || !membership.families) return null;

  const { data: members, error: membersError } = await supabase
    .from('family_members')
    .select('family_id, user_id, profile_type, role, member_role, joined_at, profiles(display_name)')
    .eq('family_id', membership.family_id);

  if (membersError) throw membersError;

  return {
    ...(membership.families as unknown as Group),
    role: membership.role,
    members: (members ?? []) as unknown as GroupMember[],
  };
}

export async function previewGroupByInviteCode(
  inviteCode: string,
): Promise<{ name: string; mode: GroupMode } | null> {
  const { data, error } = await supabase.rpc('preview_household', {
    p_invite_code: inviteCode.trim(),
  });
  if (error) throw error;
  const row = (data as { name: string; mode: GroupMode }[] | null)?.[0];
  return row ?? null;
}
