export type TaskOrigin = 'personal' | 'requested';
export type TaskStatus = 'open' | 'completed' | 'cancelled';

export type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  // Presence heartbeat, written server-side by the `touch_last_seen` RPC.
  // Null until that user's app has checked in at least once.
  last_seen_at: string | null;
  created_at: string;
  /** ISO 3166-1 alpha-2, from the device's Region setting. Exact. */
  region_code: string | null;
  /** IANA zone, from the device's calendar settings. A coarse proxy only. */
  time_zone: string | null;
  locale_updated_at: string | null;
  /** User's opt-out. When false the two fields above are cleared. */
  locale_sharing: boolean;
};

/**
 * One aggregated row from the `user_distribution_report` RPC. Counts only —
 * the RPC never returns anything that identifies a user. A row with every
 * field null is the "not shared" bucket (opted out, or not yet reported).
 */
export type DistributionRow = {
  region_code: string | null;
  region: string | null;
  city: string | null;
  time_zone: string | null;
  user_count: number;
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
  sort_order: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  creator?: Pick<Profile, 'display_name'> | null;
  assignee?: Pick<Profile, 'display_name'> | null;
};

export type NewTaskInput = {
  id: string;
  creatorId: string;
  sortOrder: number;
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
  id: string;
  creatorId: string;
  sortOrder: number;
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
  /** False once the owner's Premium lapses on a group beyond their first. */
  is_writable: boolean;
};

export type Entitlement = {
  user_id: string;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  premium_until: string | null;
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

// One row from the `app_user_stats` RPC. Counts cover every registered user,
// not just the caller. `two_group_users` is "2 or more" — today's cap is 2.
export type UserStats = {
  total_users: number;
  live_users: number;
  solo_users: number;
  one_group_users: number;
  two_group_users: number;
  /** The window `live_users` was counted over; returned by the server so the
   *  screen's caption can't drift from the query. */
  live_window_seconds: number;
};
