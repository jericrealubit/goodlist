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

export type HouseholdRole = 'owner' | 'member';
export type ProfileType = 'adult' | 'child';

export type Family = {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
  mode: string;
  created_at: string;
};

export type FamilyMember = {
  family_id: string;
  user_id: string;
  profile_type: ProfileType;
  role: HouseholdRole;
  joined_at: string;
  profiles: Pick<Profile, 'display_name'> | null;
};

export type HouseholdSummary = {
  family: Family;
  role: HouseholdRole;
  members: FamilyMember[];
};
