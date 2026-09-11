import { supabase } from '@/lib/supabase';
import type { Group, GroupMember, GroupMode, GroupSummary } from '@/lib/types';

// A user can belong to up to 2 households. Two round trips total (not
// 1+N): fetch every membership row once, then one query for every group's
// member list, bucketed client-side by family_id.
export async function getMyGroups(): Promise<GroupSummary[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: memberships, error: membershipError } = await supabase
    .from('family_members')
    .select('family_id, role, families(*, is_writable)')
    .eq('user_id', user.id)
    .order('joined_at');

  if (membershipError) throw membershipError;
  if (!memberships?.length) return [];

  const familyIds = memberships.map((m) => m.family_id);
  const { data: allMembers, error: membersError } = await supabase
    .from('family_members')
    .select(
      'family_id, user_id, profile_type, role, member_role, joined_at, profiles!family_members_user_profile_fk(display_name)',
    )
    .in('family_id', familyIds);

  if (membersError) throw membersError;

  return memberships
    .filter((m) => m.families)
    .map((m) => ({
      ...(m.families as unknown as Group),
      role: m.role,
      members: (allMembers ?? []).filter((mem) => mem.family_id === m.family_id) as unknown as GroupMember[],
    }));
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
