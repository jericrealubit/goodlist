import { supabase } from '@/lib/supabase';
import type { Family, FamilyMember, HouseholdSummary } from '@/lib/types';

export async function getMyHousehold(): Promise<HouseholdSummary | null> {
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
    .select('family_id, user_id, profile_type, role, joined_at, profiles(display_name)')
    .eq('family_id', membership.family_id);

  if (membersError) throw membersError;

  return {
    family: membership.families as unknown as Family,
    role: membership.role,
    members: (members ?? []) as unknown as FamilyMember[],
  };
}
