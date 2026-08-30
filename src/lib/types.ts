export type TaskOrigin = 'personal' | 'requested';
export type TaskStatus = 'open' | 'completed' | 'cancelled';

export type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
};

export type Task = {
  id: string;
  family_id: string | null;
  creator_id: string;
  assignee_id: string;
  title: string;
  notes: string | null;
  due_at: string | null;
  origin: TaskOrigin;
  status: TaskStatus;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  creator?: Pick<Profile, 'display_name'> | null;
  assignee?: Pick<Profile, 'display_name'> | null;
};

export type NewTaskInput = {
  title: string;
  notes?: string | null;
  due_at?: string | null;
};

export type UpdateTaskInput = {
  title?: string;
  notes?: string | null;
  due_at?: string | null;
};

export type NewRequestInput = {
  title: string;
  notes?: string | null;
  due_at?: string | null;
  assigneeId: string;
  familyId: string;
};

export type GroupPermission = 'owner' | 'member';
export type ProfileType = 'adult' | 'child';

export type GroupMode = 'family' | 'team';
export type FamilyRole = 'father' | 'mother' | 'guardian' | 'child' | 'other';
export type TeamRole = 'leader' | 'member';
export type MemberRole = FamilyRole | TeamRole;

export type Group = {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
  mode: GroupMode;
  created_at: string;
};

export type GroupMember = {
  family_id: string;
  user_id: string;
  profile_type: ProfileType;
  role: GroupPermission;
  member_role: MemberRole | null;
  joined_at: string;
  profiles: Pick<Profile, 'display_name'> | null;
};

export type GroupSummary = Group & {
  role: GroupPermission;
  members: GroupMember[];
};
