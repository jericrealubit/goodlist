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
  /** A phone alarm at due_at. Opt-in, off by default; meaningless without a due date. */
  alarm_enabled: boolean;
  /** The series this task is an occurrence of, if it repeats. */
  recurrence_id: string | null;
  /** Which slot of its series this occurrence fills (local YYYY-MM-DD). Stays put if due_at is moved. */
  occurrence_date: string | null;
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
  alarm_enabled?: boolean;
};

export type UpdateTaskInput = {
  title?: string;
  notes?: string | null;
  due_at?: string | null;
  alarm_enabled?: boolean;
};

export type RecurrenceFrequency = 'daily' | 'weekly' | 'fortnightly' | 'monthly' | 'monthly_weekday' | 'custom';

/** The series behind a repeating Personal task. Each occurrence is a `Task` pointing at it. */
export type TaskRecurrence = {
  id: string;
  creator_id: string;
  title: string;
  notes: string | null;
  frequency: RecurrenceFrequency;
  /** 0 = Sunday … 6 = Saturday. 'custom' uses them all; 'monthly_weekday' its first. */
  days_of_week: number[] | null;
  /** 'monthly' only: 1–31. Null means the start date's day. */
  month_day: number | null;
  /** 'monthly_weekday' only: 1–4, or 5 for the last. Null means the start date's week. */
  month_week: number | null;
  /** YYYY-MM-DD local; the first occurrence's day. */
  start_date: string;
  /** HH:MM local, 24-hour. */
  due_time: string;
  end_date: string | null;
  alarm_enabled: boolean;
  skipped_dates: string[];
  active: boolean;
  created_at: string;
  updated_at: string;
};

/** The editable parts of a series — what the repeat picker and series editor produce. */
export type RecurrenceInput = {
  title: string;
  notes: string | null;
  frequency: RecurrenceFrequency;
  days_of_week: number[] | null;
  month_day: number | null;
  month_week: number | null;
  start_date: string;
  due_time: string;
  end_date: string | null;
  alarm_enabled: boolean;
};

export type NewRequestInput = {
  id: string;
  creatorId: string;
  sortOrder: number;
  title: string;
  notes?: string | null;
  due_at?: string | null;
  alarm_enabled?: boolean;
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

export type PremiumPlan = {
  /** RevenueCat package identifier, e.g. `$rc_monthly`. */
  id: string;
  period: 'monthly' | 'yearly';
  /** Localized price from the store, e.g. "$1.99". */
  priceLabel: string;
};

export type PurchaseOutcome = 'purchased' | 'cancelled';

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
  med_users: number;
  med_sharing_users: number;
  premium_users: number;
  /** The window `live_users` was counted over; returned by the server so the
   *  screen's caption can't drift from the query. */
  live_window_seconds: number;
};

// The singleton `system_status` row — see docs/system-status-notice.md.
// `message` is null when there's nothing to show.
export type SystemStatus = {
  message: string | null;
  updated_at: string;
};

export type DoseStatus = 'taken' | 'skipped';

export type Medication = {
  id: string;
  owner_id: string;
  name: string;
  /** Free text, e.g. "500 mg · 1 tablet". */
  dose: string | null;
  instructions: string | null;
  /** Local wall-clock times, `HH:MM`, 24-hour, earliest first. */
  times: string[];
  /** 0 = Sunday … 6 = Saturday, as `Date.getDay()`. Null means every day. */
  days_of_week: number[] | null;
  /** `YYYY-MM-DD`, local. */
  start_date: string;
  end_date: string | null;
  /** The owner's IANA zone when last saved — whose clock `times` are on. */
  time_zone: string | null;
  reminders_enabled: boolean;
  archived_at: string | null;
  /** Set only while shared with a group; sharing needs Premium. */
  shared_family_id: string | null;
  created_at: string;
  updated_at: string;
  owner?: Pick<Profile, 'display_name'> | null;
};

export type MedicationInput = {
  name: string;
  dose: string | null;
  instructions: string | null;
  times: string[];
  days_of_week: number[] | null;
  start_date: string;
  end_date: string | null;
  reminders_enabled: boolean;
  shared_family_id: string | null;
};

export type NewMedicationInput = MedicationInput & {
  id: string;
  ownerId: string;
  timeZone: string | null;
};

export type MedicationDose = {
  id: string;
  medication_id: string;
  owner_id: string;
  /** The slot this answers: its local day and `HH:MM`. */
  slot_date: string;
  slot_time: string;
  status: DoseStatus;
  logged_at: string;
  created_at: string;
  updated_at: string;
};

export type LogDoseInput = {
  id: string;
  medicationId: string;
  ownerId: string;
  slotDate: string;
  slotTime: string;
  status: DoseStatus;
  loggedAt: string;
};
