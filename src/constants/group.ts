import type { FamilyRole, GroupMode, MemberRole, TeamRole } from '@/lib/types';

export type Option<T extends string> = { id: T; label: string };

export const GROUP_MODE_OPTIONS: Option<GroupMode>[] = [
  { id: 'family', label: 'Family' },
  { id: 'team', label: 'Team' },
];

export const FAMILY_ROLE_OPTIONS: Option<FamilyRole>[] = [
  { id: 'father', label: 'Father' },
  { id: 'mother', label: 'Mother' },
  { id: 'guardian', label: 'Guardian' },
  { id: 'child', label: 'Child' },
  { id: 'other', label: 'Other' },
];

export const TEAM_ROLE_OPTIONS: Option<TeamRole>[] = [
  { id: 'leader', label: 'Leader' },
  { id: 'member', label: 'Member' },
];

export function roleOptionsForMode(mode: GroupMode): Option<MemberRole>[] {
  return mode === 'family' ? FAMILY_ROLE_OPTIONS : TEAM_ROLE_OPTIONS;
}

export function modeLabel(mode: GroupMode): string {
  return GROUP_MODE_OPTIONS.find((option) => option.id === mode)?.label ?? mode;
}

export function roleLabel(mode: GroupMode, role: MemberRole | null): string | null {
  if (!role) return null;
  return roleOptionsForMode(mode).find((option) => option.id === role)?.label ?? null;
}
