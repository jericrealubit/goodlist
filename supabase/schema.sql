-- Goodlist — Solo MVP schema
-- Run once in the Supabase SQL editor for your project.
--
-- Scope: profiles + tasks only (origin = 'personal'). The `family_id` and
-- `origin`/`requested` support are included now so the household/requested
-- phase is a pure additive migration later — see "Goodlist — Project Plan.md"
-- sections 12-14.

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
  on public.profiles for select
  using (id = auth.uid());

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  using (id = auth.uid());

-- Auto-create a profile row whenever a new auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'display_name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- tasks
-- ---------------------------------------------------------------------------

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  family_id uuid null,
  creator_id uuid not null references auth.users (id) on delete cascade,
  assignee_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  notes text,
  due_at timestamptz,
  origin text not null default 'personal' check (origin in ('personal', 'requested')),
  status text not null default 'open' check (status in ('open', 'completed', 'cancelled')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint personal_tasks_self_assigned
    check (origin <> 'personal' or creator_id = assignee_id)
);

create index if not exists tasks_creator_id_idx on public.tasks (creator_id);

-- Manual ordering for the task list (drag to rearrange). Ascending = earlier
-- in the list. Backfilled from created_at so existing newest-first order is
-- preserved, and defaulted so every future insert sorts above everything
-- older without any client-side change.
alter table public.tasks add column if not exists sort_order double precision;
update public.tasks set sort_order = -extract(epoch from created_at) where sort_order is null;
alter table public.tasks alter column sort_order set default (-extract(epoch from clock_timestamp()));
alter table public.tasks alter column sort_order set not null;
create index if not exists tasks_sort_order_idx on public.tasks (sort_order);

alter table public.tasks enable row level security;

drop policy if exists "Owners can view their own tasks" on public.tasks;
create policy "Owners can view their own tasks"
  on public.tasks for select
  using (creator_id = auth.uid());

drop policy if exists "Owners can create their own personal tasks" on public.tasks;
create policy "Owners can create their own personal tasks"
  on public.tasks for insert
  with check (
    creator_id = auth.uid()
    and assignee_id = auth.uid()
    and origin = 'personal'
  );

drop policy if exists "Owners can update their own tasks" on public.tasks;
create policy "Owners can update their own tasks"
  on public.tasks for update
  using (creator_id = auth.uid());

drop policy if exists "Owners can delete their own tasks" on public.tasks;
create policy "Owners can delete their own tasks"
  on public.tasks for delete
  using (creator_id = auth.uid());

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- households (Phase 3 — see "Goodlist — Project Plan.md" section 18)
--
-- Deliberately does not touch `tasks` or its RLS: Personal tasks stay
-- owner-only visible and keep a nullable `family_id` whether or not the
-- owner belongs to a household (plan sections 12.1, 21), so joining/creating
-- a household is a pure addition, not a migration.
-- ---------------------------------------------------------------------------

create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  created_by uuid not null references auth.users (id) on delete cascade,
  mode text not null default 'household',
  created_at timestamptz not null default now()
);

-- user_id carries two FK constraints (auth.users and profiles) rather than a
-- separate profile_id column, since profiles.id === auth.users.id 1:1. The
-- second FK is what lets PostgREST embed profiles(display_name) in queries.
create table if not exists public.family_members (
  family_id uuid not null references public.families (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  profile_type text not null default 'adult' check (profile_type in ('adult', 'child')),
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (family_id, user_id),
  constraint family_members_user_profile_fk foreign key (user_id) references public.profiles (id) on delete cascade
);

-- Backfill legacy 'household' mode values, then constrain to the Family/Team
-- toggle exposed by the create-group screen.
update public.families set mode = 'family' where mode not in ('family', 'team');
alter table public.families alter column mode set default 'family';
alter table public.families drop constraint if exists families_mode_check;
alter table public.families add constraint families_mode_check check (mode in ('family', 'team'));

-- Descriptive role label (e.g. Father, Leader), separate from the owner/member
-- permission role above. Nullable so existing members are unaffected.
alter table public.family_members add column if not exists member_role text;
alter table public.family_members drop constraint if exists family_members_member_role_check;
alter table public.family_members add constraint family_members_member_role_check
  check (member_role is null or member_role in ('father', 'mother', 'guardian', 'child', 'other', 'leader', 'member'));

-- Generate a short, unambiguous invite code (no 0/O/1/I) if one wasn't
-- supplied, retrying on the rare unique-constraint collision.
create or replace function public.generate_invite_code()
returns text
language plpgsql
as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
begin
  loop
    code := '';
    for i in 1..8 loop
      code := code || substr(alphabet, floor(random() * length(alphabet) + 1)::int, 1);
    end loop;
    exit when not exists (select 1 from public.families where invite_code = code);
  end loop;
  return code;
end;
$$;

create or replace function public.set_family_invite_code()
returns trigger
language plpgsql
as $$
begin
  if new.invite_code is null then
    new.invite_code := public.generate_invite_code();
  end if;
  return new;
end;
$$;

drop trigger if exists families_set_invite_code on public.families;
create trigger families_set_invite_code
  before insert on public.families
  for each row execute function public.set_family_invite_code();

-- SECURITY DEFINER so RLS policies on families/family_members can check
-- membership without recursively re-triggering RLS on family_members itself.
create or replace function public.is_household_member(p_family_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.family_members
    where family_id = p_family_id and user_id = auth.uid()
  );
$$;

-- Extends the profiles RLS from the earlier section: household-mates need to
-- see each other's display_name for the member list. Additive to (not a
-- replacement of) "Users can view their own profile" — Postgres ORs policies
-- for the same command together.
drop policy if exists "Household members can view each other's profile" on public.profiles;
create policy "Household members can view each other's profile"
  on public.profiles for select
  using (
    exists (
      select 1 from public.family_members fm
      where fm.user_id = profiles.id
        and public.is_household_member(fm.family_id)
    )
  );

alter table public.families enable row level security;
alter table public.family_members enable row level security;

drop policy if exists "Members can view their household" on public.families;
create policy "Members can view their household"
  on public.families for select
  using (public.is_household_member(id) or created_by = auth.uid());

drop policy if exists "Users can create a household" on public.families;
create policy "Users can create a household"
  on public.families for insert
  with check (created_by = auth.uid());

drop policy if exists "Members can view their household's members" on public.family_members;
create policy "Members can view their household's members"
  on public.family_members for select
  using (public.is_household_member(family_id));

-- No insert/update/delete policies on family_members: membership only
-- changes through the SECURITY DEFINER RPCs below, so a user can never
-- insert themselves into an arbitrary family_id even by guessing one.

-- Validates a descriptive member_role against the vocabulary for a given
-- family/team mode; a null role is always valid (role is optional).
create or replace function public.family_role_is_valid(p_mode text, p_role text)
returns boolean
language sql
immutable
as $$
  select p_role is null or (
    case p_mode
      when 'family' then p_role in ('father', 'mother', 'guardian', 'child', 'other')
      when 'team' then p_role in ('leader', 'member')
      else false
    end
  );
$$;

create or replace function public.create_household(p_name text, p_mode text default 'family', p_member_role text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_family_id uuid;
begin
  if exists (select 1 from public.family_members where user_id = auth.uid()) then
    raise exception 'You already belong to a household.';
  end if;

  if p_mode not in ('family', 'team') then
    raise exception 'Invalid group type.';
  end if;

  if not public.family_role_is_valid(p_mode, p_member_role) then
    raise exception 'Invalid role for this group type.';
  end if;

  insert into public.families (name, created_by, mode)
  values (p_name, auth.uid(), p_mode)
  returning id into v_family_id;

  insert into public.family_members (family_id, user_id, role, member_role)
  values (v_family_id, auth.uid(), 'owner', p_member_role);

  return v_family_id;
end;
$$;

create or replace function public.join_household(p_invite_code text, p_member_role text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_family_id uuid;
  v_mode text;
begin
  if exists (select 1 from public.family_members where user_id = auth.uid()) then
    raise exception 'You already belong to a household.';
  end if;

  select id, mode into v_family_id, v_mode from public.families where invite_code = upper(p_invite_code);
  if v_family_id is null then
    raise exception 'Invalid invite code.';
  end if;

  if not public.family_role_is_valid(v_mode, p_member_role) then
    raise exception 'Invalid role for this group type.';
  end if;

  insert into public.family_members (family_id, user_id, role, member_role)
  values (v_family_id, auth.uid(), 'member', p_member_role);

  return v_family_id;
end;
$$;

-- Lets the join screen show a group's name/mode (to pick the right role list)
-- before committing to join, without exposing membership data.
create or replace function public.preview_household(p_invite_code text)
returns table(name text, mode text)
language sql
security definer
stable
set search_path = public
as $$
  select f.name, f.mode from public.families f where f.invite_code = upper(p_invite_code);
$$;

-- ---------------------------------------------------------------------------
-- household management (Tier 1 hardening — rename, leave, remove a member,
-- transfer ownership). None of these take a family_id parameter: a user
-- belongs to at most one household (enforced by create_household/
-- join_household above), so each function derives it from the caller's own
-- membership row instead of trusting a client-supplied id.
-- ---------------------------------------------------------------------------

create or replace function public.rename_household(p_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_family_id uuid;
  v_role text;
begin
  select family_id, role into v_family_id, v_role
  from public.family_members
  where user_id = auth.uid();

  if v_family_id is null then
    raise exception 'You are not in a household.';
  end if;
  if v_role <> 'owner' then
    raise exception 'Only the household owner can rename it.';
  end if;
  if trim(p_name) = '' then
    raise exception 'Household name cannot be empty.';
  end if;

  update public.families set name = trim(p_name) where id = v_family_id;
end;
$$;

create or replace function public.leave_household()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_family_id uuid;
  v_role text;
  v_other_members int;
begin
  select family_id, role into v_family_id, v_role
  from public.family_members
  where user_id = auth.uid();

  if v_family_id is null then
    raise exception 'You are not in a household.';
  end if;

  if v_role = 'owner' then
    select count(*) into v_other_members
    from public.family_members
    where family_id = v_family_id and user_id <> auth.uid();

    if v_other_members > 0 then
      raise exception 'Transfer ownership or remove all other members before leaving.';
    end if;

    -- Sole remaining member and owner: the household would be empty, so
    -- remove it entirely rather than leaving an orphaned row behind.
    delete from public.families where id = v_family_id;
  else
    delete from public.family_members where family_id = v_family_id and user_id = auth.uid();
  end if;
end;
$$;

create or replace function public.remove_household_member(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_family_id uuid;
  v_role text;
begin
  select family_id, role into v_family_id, v_role
  from public.family_members
  where user_id = auth.uid();

  if v_family_id is null then
    raise exception 'You are not in a household.';
  end if;
  if v_role <> 'owner' then
    raise exception 'Only the household owner can remove a member.';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'Use "Leave household" to remove yourself.';
  end if;
  if not exists (
    select 1 from public.family_members where family_id = v_family_id and user_id = p_user_id
  ) then
    raise exception 'That person is not in your household.';
  end if;

  delete from public.family_members where family_id = v_family_id and user_id = p_user_id;
end;
$$;

create or replace function public.transfer_household_ownership(p_new_owner_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_family_id uuid;
  v_role text;
begin
  select family_id, role into v_family_id, v_role
  from public.family_members
  where user_id = auth.uid();

  if v_family_id is null then
    raise exception 'You are not in a household.';
  end if;
  if v_role <> 'owner' then
    raise exception 'Only the household owner can transfer ownership.';
  end if;
  if p_new_owner_id = auth.uid() then
    raise exception 'You already own this household.';
  end if;
  if not exists (
    select 1 from public.family_members where family_id = v_family_id and user_id = p_new_owner_id
  ) then
    raise exception 'That person is not in your household.';
  end if;

  update public.family_members set role = 'member' where family_id = v_family_id and user_id = auth.uid();
  update public.family_members set role = 'owner' where family_id = v_family_id and user_id = p_new_owner_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- requested tasks (Phase 4 — see "Goodlist — Project Plan.md" sections 6.6-6.8,
-- 12, 14)
--
-- Extends (drops and recreates) the tasks RLS from the earlier section rather
-- than modifying it in place, since the broadened policies below reference
-- is_household_member(), which is only defined once the households section
-- above has run.
-- ---------------------------------------------------------------------------

-- Generalizes is_household_member() (hardcoded to auth.uid()) to check an
-- arbitrary user — needed to verify the *assignee*, not just the requester,
-- belongs to the target household when a request is created.
create or replace function public.family_has_member(p_family_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.family_members
    where family_id = p_family_id and user_id = p_user_id
  );
$$;

-- Lets PostgREST embed profiles(display_name) for a task's requester/assignee
-- (household members can already view each other's profile, per the policy
-- added in the households section above).
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'tasks_creator_profile_fk') then
    alter table public.tasks
      add constraint tasks_creator_profile_fk foreign key (creator_id) references public.profiles (id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'tasks_assignee_profile_fk') then
    alter table public.tasks
      add constraint tasks_assignee_profile_fk foreign key (assignee_id) references public.profiles (id) on delete cascade;
  end if;
end $$;

-- Broaden select/update from creator-only to creator-or-assignee, so a
-- Requested task's recipient can see and complete it (plan section 14).
-- Personal tasks are unaffected: creator = assignee = self already.
drop policy if exists "Owners can view their own tasks" on public.tasks;
drop policy if exists "Members can view their own or assigned tasks" on public.tasks;
create policy "Members can view their own or assigned tasks"
  on public.tasks for select
  using (creator_id = auth.uid() or assignee_id = auth.uid());

drop policy if exists "Owners can update their own tasks" on public.tasks;
drop policy if exists "Creators or assignees can update their tasks" on public.tasks;
create policy "Creators or assignees can update their tasks"
  on public.tasks for update
  using (creator_id = auth.uid() or assignee_id = auth.uid());

-- Additive to (not a replacement of) "Owners can create their own personal
-- tasks" — Postgres ORs policies for the same command together, so personal
-- inserts keep working unchanged.
drop policy if exists "Household members can request tasks from each other" on public.tasks;
create policy "Household members can request tasks from each other"
  on public.tasks for insert
  with check (
    origin = 'requested'
    and creator_id = auth.uid()
    and assignee_id <> auth.uid()
    and family_id is not null
    and public.is_household_member(family_id)
    and public.family_has_member(family_id, assignee_id)
  );

-- Delete policy (creator-only hard delete) is unchanged and intentionally
-- stays that way for Personal tasks; Requested tasks are cancelled (status
-- update, covered by the broadened update policy above) rather than deleted.

-- ---------------------------------------------------------------------------
-- collaboration quality (Phase 5 — see "Goodlist — Project Plan.md" section
-- 18, section 13's notifications row, FR-11, FR-12)
-- ---------------------------------------------------------------------------

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  task_id uuid not null references public.tasks (id) on delete cascade,
  type text not null default 'task_requested' check (type in ('task_requested')),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_unread_idx
  on public.notifications (user_id) where read_at is null;

alter table public.notifications enable row level security;

drop policy if exists "Users can view their own notifications" on public.notifications;
create policy "Users can view their own notifications"
  on public.notifications for select
  using (user_id = auth.uid());

drop policy if exists "Users can update their own notifications" on public.notifications;
create policy "Users can update their own notifications"
  on public.notifications for update
  using (user_id = auth.uid());

-- No insert policy: rows are only created by the trigger below, which (like
-- handle_new_user for profiles) runs as the table owner and bypasses RLS.

-- Notifies the assignee whenever a new Requested task is created (FR-11).
-- Not extended to completion/cancellation — not asked for by FR-11's text.
create or replace function public.notify_task_requested()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.origin = 'requested' then
    insert into public.notifications (user_id, task_id, type)
    values (new.assignee_id, new.id, 'task_requested');
  end if;
  return new;
end;
$$;

drop trigger if exists tasks_notify_requested on public.tasks;
create trigger tasks_notify_requested
  after insert on public.tasks
  for each row execute function public.notify_task_requested();

-- Enable Realtime on tasks + notifications so clients can subscribe to
-- postgres_changes (delivery is still scoped by each table's RLS policies
-- above, evaluated per the subscribing user's JWT).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'tasks'
  ) then
    alter publication supabase_realtime add table public.tasks;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- account deletion (App Store Review Guideline 5.1.1(v): apps that support
-- account creation must let the user initiate deletion in-app)
--
-- Every table referencing a user (profiles, tasks.creator_id/assignee_id,
-- family_members.user_id, families.created_by) already has
-- `on delete cascade`, so deleting the auth.users row alone cleans up
-- everything else. Because families.created_by also cascades, an owner
-- deleting their account would otherwise destroy the whole household out
-- from under any members still in it — blocked below instead; the owner
-- must transfer ownership (transfer_household_ownership) or remove the
-- other members (remove_household_member) first.
-- ---------------------------------------------------------------------------

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_family_id uuid;
  v_role text;
  v_other_members int;
begin
  select family_id, role into v_family_id, v_role
  from public.family_members
  where user_id = auth.uid();

  if v_role = 'owner' then
    select count(*) into v_other_members
    from public.family_members
    where family_id = v_family_id and user_id <> auth.uid();

    if v_other_members > 0 then
      raise exception 'Transfer ownership or remove all other members before deleting your account.';
    end if;
  end if;

  delete from auth.users where id = auth.uid();
end;
$$;

-- ---------------------------------------------------------------------------
-- multi-household support (up to 2 households per user)
-- ---------------------------------------------------------------------------

-- create or replace does NOT replace a function whose argument list changed
-- (Postgres treats it as a distinct overload) — the four functions below
-- gain a p_family_id parameter, so their old signatures must be dropped
-- first or the old, single-membership-assuming versions stay live and
-- callable alongside the new ones.
drop function if exists public.rename_household(text);
drop function if exists public.leave_household();
drop function if exists public.remove_household_member(uuid);
drop function if exists public.transfer_household_ownership(uuid);

create or replace function public.create_household(p_name text, p_mode text default 'family', p_member_role text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_family_id uuid;
  v_membership_count int;
begin
  -- Serializes concurrent calls from the same user so two simultaneous
  -- create/join attempts can't both pass the count check below and push the
  -- caller past the 2-household cap.
  perform pg_advisory_xact_lock(hashtext('household_membership:' || auth.uid()::text));

  select count(*) into v_membership_count from public.family_members where user_id = auth.uid();
  if v_membership_count >= 2 then
    raise exception 'You already belong to the maximum of 2 households.';
  end if;

  if p_mode not in ('family', 'team') then
    raise exception 'Invalid group type.';
  end if;

  if not public.family_role_is_valid(p_mode, p_member_role) then
    raise exception 'Invalid role for this group type.';
  end if;

  insert into public.families (name, created_by, mode)
  values (p_name, auth.uid(), p_mode)
  returning id into v_family_id;

  insert into public.family_members (family_id, user_id, role, member_role)
  values (v_family_id, auth.uid(), 'owner', p_member_role);

  return v_family_id;
end;
$$;

create or replace function public.join_household(p_invite_code text, p_member_role text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_family_id uuid;
  v_mode text;
  v_membership_count int;
begin
  perform pg_advisory_xact_lock(hashtext('household_membership:' || auth.uid()::text));

  select count(*) into v_membership_count from public.family_members where user_id = auth.uid();
  if v_membership_count >= 2 then
    raise exception 'You already belong to the maximum of 2 households.';
  end if;

  select id, mode into v_family_id, v_mode from public.families where invite_code = upper(p_invite_code);
  if v_family_id is null then
    raise exception 'Invalid invite code.';
  end if;

  -- With multiple memberships possible, re-joining a household the caller is
  -- already in must fail with a clean message instead of a raw composite-PK
  -- unique-violation error.
  if exists (select 1 from public.family_members where family_id = v_family_id and user_id = auth.uid()) then
    raise exception 'You are already a member of this household.';
  end if;

  if not public.family_role_is_valid(v_mode, p_member_role) then
    raise exception 'Invalid role for this group type.';
  end if;

  insert into public.family_members (family_id, user_id, role, member_role)
  values (v_family_id, auth.uid(), 'member', p_member_role);

  return v_family_id;
end;
$$;

create or replace function public.rename_household(p_family_id uuid, p_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  select role into v_role
  from public.family_members
  where family_id = p_family_id and user_id = auth.uid();

  if v_role is null then
    raise exception 'You are not a member of that household.';
  end if;
  if v_role <> 'owner' then
    raise exception 'Only the household owner can rename it.';
  end if;
  if trim(p_name) = '' then
    raise exception 'Household name cannot be empty.';
  end if;

  update public.families set name = trim(p_name) where id = p_family_id;
end;
$$;

create or replace function public.leave_household(p_family_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_other_members int;
begin
  select role into v_role
  from public.family_members
  where family_id = p_family_id and user_id = auth.uid();

  if v_role is null then
    raise exception 'You are not a member of that household.';
  end if;

  if v_role = 'owner' then
    select count(*) into v_other_members
    from public.family_members
    where family_id = p_family_id and user_id <> auth.uid();

    if v_other_members > 0 then
      raise exception 'Transfer ownership or remove all other members before leaving.';
    end if;

    -- Sole remaining member and owner: the household would be empty, so
    -- remove it entirely rather than leaving an orphaned row behind.
    delete from public.families where id = p_family_id;
  else
    delete from public.family_members where family_id = p_family_id and user_id = auth.uid();
  end if;
end;
$$;

create or replace function public.remove_household_member(p_family_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  select role into v_role
  from public.family_members
  where family_id = p_family_id and user_id = auth.uid();

  if v_role is null then
    raise exception 'You are not a member of that household.';
  end if;
  if v_role <> 'owner' then
    raise exception 'Only the household owner can remove a member.';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'Use "Leave household" to remove yourself.';
  end if;
  if not exists (
    select 1 from public.family_members where family_id = p_family_id and user_id = p_user_id
  ) then
    raise exception 'That person is not in your household.';
  end if;

  delete from public.family_members where family_id = p_family_id and user_id = p_user_id;
end;
$$;

create or replace function public.transfer_household_ownership(p_family_id uuid, p_new_owner_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  select role into v_role
  from public.family_members
  where family_id = p_family_id and user_id = auth.uid();

  if v_role is null then
    raise exception 'You are not a member of that household.';
  end if;
  if v_role <> 'owner' then
    raise exception 'Only the household owner can transfer ownership.';
  end if;
  if p_new_owner_id = auth.uid() then
    raise exception 'You already own this household.';
  end if;
  if not exists (
    select 1 from public.family_members where family_id = p_family_id and user_id = p_new_owner_id
  ) then
    raise exception 'That person is not in your household.';
  end if;

  update public.family_members set role = 'member' where family_id = p_family_id and user_id = auth.uid();
  update public.family_members set role = 'owner' where family_id = p_family_id and user_id = p_new_owner_id;
end;
$$;

-- Keeps its 0-argument signature — plain create or replace overwrites it in
-- place, no drop needed. Set-based (EXISTS), not looped: at most 2 rows, so
-- an EXISTS over "any owned household with other members" is simpler than
-- tracking loop state, and it checks ALL memberships instead of just one.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1
    from public.family_members fm
    where fm.user_id = auth.uid()
      and fm.role = 'owner'
      and exists (
        select 1 from public.family_members other
        where other.family_id = fm.family_id and other.user_id <> auth.uid()
      )
  ) then
    raise exception 'Transfer ownership or remove all other members before deleting your account.';
  end if;

  delete from auth.users where id = auth.uid();
end;
$$;

-- ---------------------------------------------------------------------------
-- user statistics (community stats screen)
--
-- Every number the stats screen shows is an aggregate over *all* users, which
-- `profiles` RLS deliberately forbids reading row by row. `app_user_stats()`
-- below is the one sanctioned way across that line: it is SECURITY DEFINER so
-- it can count past RLS, but it only ever returns counts — no id, name, or
-- timestamp belonging to another user leaves it.
-- ---------------------------------------------------------------------------

-- Presence heartbeat. Nullable, so every existing profile simply reads as
-- "never seen" until that user's app next checks in.
alter table public.profiles add column if not exists last_seen_at timestamptz;

-- Deliberately NOT indexed: the stats query below aggregates over every
-- profile row (it needs the total anyway), so an index on last_seen_at would
-- go unused while making each 60s heartbeat write more expensive.

-- Counting a user's groups keys on user_id alone, which the
-- (family_id, user_id) primary key can't serve — its leading column is
-- family_id. Also speeds up the existing "my memberships" lookup in
-- src/lib/queries/group.ts.
create index if not exists family_members_user_id_idx on public.family_members (user_id);

-- Presence heartbeat, called every 60s while the app is foregrounded.
-- SECURITY INVOKER (the default) on purpose: the caller already owns this row
-- under "Users can update their own profile", so no elevated privilege is
-- needed. The point of the RPC is that `now()` is the *server's* clock — a
-- client-supplied timestamp could fake being live.
create or replace function public.touch_last_seen()
returns void
language sql
set search_path = public
as $$
  update public.profiles set last_seen_at = now() where id = auth.uid();
$$;

-- Community-wide counts for the stats screen, as a single row.
--
-- `live_window_seconds` is returned rather than hardcoded in the client so the
-- screen's "active in the last N minutes" caption can never drift out of sync
-- with the window actually used here.
create or replace function public.app_user_stats()
returns table (
  total_users int,
  live_users int,
  solo_users int,
  one_group_users int,
  two_group_users int,
  live_window_seconds int
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  -- Twice the client's 60s heartbeat, so a single dropped beat (a flaky
  -- connection, a slow request) doesn't blink a user out of the live count.
  v_window constant interval := interval '2 minutes';
begin
  if auth.uid() is null then
    raise exception 'Sign in to view user statistics.';
  end if;

  -- Aggregate the memberships once and join, rather than a correlated
  -- count(*) per profile: one pass over each table instead of one index
  -- lookup per registered user.
  return query
  with group_counts as (
    select fm.user_id, count(*) as group_count
    from public.family_members fm
    group by fm.user_id
  ),
  per_user as (
    select p.last_seen_at, coalesce(g.group_count, 0) as group_count
    from public.profiles p
    left join group_counts g on g.user_id = p.id
  )
  select
    count(*)::int,
    count(*) filter (where per_user.last_seen_at > now() - v_window)::int,
    count(*) filter (where per_user.group_count = 0)::int,
    count(*) filter (where per_user.group_count = 1)::int,
    -- A user can hold at most 2 memberships (create_household/join_household
    -- enforce the cap), but count >= 2 rather than = 2 so a future cap raise
    -- can't silently drop users out of every bucket.
    count(*) filter (where per_user.group_count >= 2)::int,
    (extract(epoch from v_window))::int
  from per_user;
end;
$$;

-- Postgres grants EXECUTE on a new function to PUBLIC by default, which would
-- expose both of these to the anon key. Signed-in users only.
revoke execute on function public.touch_last_seen() from public;
revoke execute on function public.app_user_stats() from public;
grant execute on function public.touch_last_seen() to authenticated;
grant execute on function public.app_user_stats() to authenticated;

-- ---------------------------------------------------------------------------
-- Coarse locale telemetry + the "User distribution" admin report
--
-- Source of the data: expo-localization on the client. Two values only —
-- `Localization.getLocales()[0].regionCode` (the device's Region setting) and
-- `Localization.getCalendars()[0].timeZone` (IANA). No GPS, no permission
-- prompt, no IP lookup, no third-party geo service.
--
-- PRECISION, stated once and honoured everywhere below:
--   * country  — EXACT. It is the device's own Region setting.
--   * region   — APPROXIMATE. Derived from the time zone, and only for
--                countries that HAVE more than one zone. A zone like
--                'America/Los_Angeles' spans several states, so the label is
--                the zone's span, not an administrative subdivision.
--   * city     — Only ever set where the zone genuinely IS a single city
--                (Singapore, Hong Kong, Monaco…). Everywhere else it stays
--                null rather than pretending the zone's label city is where
--                the user lives.
-- A country with exactly one time zone carries NO sub-national signal at all,
-- so it deliberately gets no row in timezone_locations — the report shows such
-- users under the country with "not available" beneath it. Inventing a city
-- for them would be worse than admitting we don't know.
-- ---------------------------------------------------------------------------

alter table public.profiles add column if not exists region_code text;
alter table public.profiles add column if not exists time_zone text;
alter table public.profiles add column if not exists locale_updated_at timestamptz;
alter table public.profiles add column if not exists locale_sharing boolean not null default true;

alter table public.profiles drop constraint if exists profiles_region_code_check;
alter table public.profiles add constraint profiles_region_code_check
  check (region_code is null or region_code ~ '^[A-Z]{2}$');

create index if not exists profiles_region_code_idx on public.profiles (region_code);

-- No new RLS policy: "Users can update their own profile" (defined at the top
-- of this file) already covers the client writing these columns on its own row.

-- ---------------------------------------------------------------------------
-- timezone_locations — IANA zone to a sub-national label, where one exists.
-- Rows are only present for zones that actually narrow a user's location down
-- within their country. See the precision note above.
-- ---------------------------------------------------------------------------

create table if not exists public.timezone_locations (
  time_zone text primary key,
  region text,
  city text
);

-- The device's Region setting is a LANGUAGE/FORMATTING preference, not a
-- location: a phone in Perth set to English (US) reports 'US'. The time zone
-- is the better country signal, so it is the primary source and the device
-- region is only a fallback. Every known IANA zone therefore carries a
-- country_code, while region/city stay sparse (see the precision note above).
alter table public.timezone_locations add column if not exists country_code text;
alter table public.timezone_locations drop constraint if exists timezone_locations_has_signal;
alter table public.timezone_locations drop constraint if exists timezone_locations_country_code_check;
alter table public.timezone_locations add constraint timezone_locations_country_code_check
  check (country_code is null or country_code ~ '^[A-Z]{2}$');

insert into public.timezone_locations (time_zone, region, city) values
  -- United States
  ('America/New_York',       'Eastern Time',                 null),
  ('America/Detroit',        'Michigan',                     null),
  ('America/Indiana/Indianapolis', 'Indiana',                null),
  ('America/Kentucky/Louisville',  'Kentucky',               null),
  ('America/Chicago',        'Central Time',                 null),
  ('America/Denver',         'Mountain Time',                null),
  ('America/Phoenix',        'Arizona',                      null),
  ('America/Boise',          'Idaho / Oregon (Mountain)',    null),
  ('America/Los_Angeles',    'Pacific Time',                 null),
  ('America/Anchorage',      'Alaska',                       null),
  ('America/Juneau',         'Alaska',                       null),
  ('America/Nome',           'Alaska',                       null),
  ('Pacific/Honolulu',       'Hawaii',                       null),
  ('America/Puerto_Rico',    'Puerto Rico',                  null),
  ('Pacific/Guam',           'Guam',                         null),
  -- Canada
  ('America/St_Johns',       'Newfoundland and Labrador',    null),
  ('America/Halifax',        'Atlantic Canada',              null),
  ('America/Moncton',        'New Brunswick',                null),
  ('America/Toronto',        'Ontario / Quebec',             null),
  ('America/Winnipeg',       'Manitoba',                     null),
  ('America/Regina',         'Saskatchewan',                 null),
  ('America/Edmonton',       'Alberta',                      null),
  ('America/Vancouver',      'British Columbia',             null),
  ('America/Whitehorse',     'Yukon',                        null),
  ('America/Yellowknife',    'Northwest Territories',        null),
  ('America/Iqaluit',        'Nunavut',                      null),
  -- Mexico
  ('America/Mexico_City',    'Central Mexico',               null),
  ('America/Monterrey',      'Nuevo Leon / northeast',       null),
  ('America/Chihuahua',      'Chihuahua',                    null),
  ('America/Hermosillo',     'Sonora',                       null),
  ('America/Tijuana',        'Baja California',              null),
  ('America/Cancun',         'Quintana Roo',                 null),
  ('America/Merida',         'Yucatan / Campeche',           null),
  -- Brazil
  ('America/Sao_Paulo',      'Southeast / South Brazil',     null),
  ('America/Bahia',          'Bahia',                        null),
  ('America/Fortaleza',      'Northeast Brazil',             null),
  ('America/Recife',         'Pernambuco',                   null),
  ('America/Belem',          'Para',                         null),
  ('America/Manaus',         'Amazonas',                     null),
  ('America/Cuiaba',         'Mato Grosso',                  null),
  ('America/Campo_Grande',   'Mato Grosso do Sul',           null),
  ('America/Porto_Velho',    'Rondonia',                     null),
  ('America/Boa_Vista',      'Roraima',                      null),
  ('America/Rio_Branco',     'Acre',                         null),
  ('America/Noronha',        'Fernando de Noronha',          null),
  -- Australia
  ('Australia/Sydney',       'New South Wales',              null),
  ('Australia/Melbourne',    'Victoria',                     null),
  ('Australia/Brisbane',     'Queensland',                   null),
  ('Australia/Adelaide',     'South Australia',              null),
  ('Australia/Perth',        'Western Australia',            null),
  ('Australia/Hobart',       'Tasmania',                     null),
  ('Australia/Darwin',       'Northern Territory',           null),
  ('Australia/Broken_Hill',  'New South Wales (far west)',   null),
  -- Indonesia
  ('Asia/Jakarta',           'Western Indonesia',            null),
  ('Asia/Pontianak',         'West Kalimantan',              null),
  ('Asia/Makassar',          'Central Indonesia',            null),
  ('Asia/Jayapura',          'Eastern Indonesia',            null),
  -- Malaysia
  ('Asia/Kuala_Lumpur',      'Peninsular Malaysia',          null),
  ('Asia/Kuching',           'Sabah and Sarawak',            null),
  -- Russia
  ('Europe/Kaliningrad',     'Kaliningrad',                  null),
  ('Europe/Moscow',          'Western Russia',               null),
  ('Europe/Samara',          'Samara',                       null),
  ('Asia/Yekaterinburg',     'Urals',                        null),
  ('Asia/Omsk',              'Omsk',                         null),
  ('Asia/Novosibirsk',       'Novosibirsk',                  null),
  ('Asia/Krasnoyarsk',       'Krasnoyarsk',                  null),
  ('Asia/Irkutsk',           'Irkutsk',                      null),
  ('Asia/Yakutsk',           'Yakutia',                      null),
  ('Asia/Vladivostok',       'Primorsky',                    null),
  ('Asia/Magadan',           'Magadan',                      null),
  ('Asia/Kamchatka',         'Kamchatka',                    null),
  -- China
  ('Asia/Shanghai',          'Eastern China',                null),
  ('Asia/Urumqi',            'Xinjiang',                     null),
  -- Other multi-zone countries
  ('Asia/Almaty',            'Southeastern Kazakhstan',      null),
  ('Asia/Aqtobe',            'Western Kazakhstan',           null),
  ('Pacific/Auckland',       'New Zealand (main islands)',   null),
  ('Pacific/Chatham',        'Chatham Islands',              null),
  ('Atlantic/Canary',        'Canary Islands',               null),
  ('Europe/Madrid',          'Mainland Spain',               null),
  ('Atlantic/Azores',        'Azores',                       null),
  ('Europe/Lisbon',          'Mainland Portugal',            null),
  ('America/Argentina/Buenos_Aires', 'Buenos Aires',         null),
  ('America/Argentina/Cordoba',      'Cordoba',              null),
  ('America/Argentina/Mendoza',      'Mendoza',              null),
  ('Pacific/Galapagos',      'Galapagos',                    null),
  ('America/Guayaquil',      'Mainland Ecuador',             null),
  ('Asia/Nicosia',           'Cyprus (south)',               null),
  ('Africa/Lagos',           'Southern Nigeria',             null),
  ('America/Santiago',       'Mainland Chile',               null),
  ('Pacific/Easter',         'Easter Island',                null),
  ('America/Nuuk',           'Greenland (west)',             null),
  ('Asia/Kathmandu',         'Nepal',                        null),
  -- Zones that genuinely ARE a single city or city-state: city is EXACT here.
  ('Asia/Singapore',         null,                           'Singapore'),
  ('Asia/Hong_Kong',         null,                           'Hong Kong'),
  ('Asia/Macau',             null,                           'Macau'),
  ('Europe/Monaco',          null,                           'Monaco'),
  ('Europe/Vatican',         null,                           'Vatican City'),
  ('Europe/San_Marino',      null,                           'San Marino'),
  ('Europe/Gibraltar',       null,                           'Gibraltar'),
  ('Europe/Andorra',         null,                           'Andorra la Vella'),
  ('Europe/Vaduz',           null,                           'Vaduz'),
  ('Europe/Luxembourg',      null,                           'Luxembourg City'),
  ('Europe/Malta',           null,                           'Valletta'),
  ('Asia/Bahrain',           null,                           'Manama'),
  ('Asia/Qatar',             null,                           'Doha'),
  ('Asia/Kuwait',            null,                           'Kuwait City'),
  ('Indian/Maldives',        null,                           'Male'),
  ('Atlantic/Bermuda',       null,                           'Hamilton')
on conflict (time_zone) do update
  set region = excluded.region, city = excluded.city;

-- 534 zones. Generated from the IANA tzdb (zone.tab + zone1970.tab)
-- plus the widely-reported 'backward' link names, which devices still send.
insert into public.timezone_locations (time_zone, country_code) values
  ('Africa/Abidjan', 'CI'),
  ('Africa/Accra', 'GH'),
  ('Africa/Addis_Ababa', 'ET'),
  ('Africa/Algiers', 'DZ'),
  ('Africa/Asmara', 'ER'),
  ('Africa/Asmera', 'ER'),
  ('Africa/Bamako', 'ML'),
  ('Africa/Bangui', 'CF'),
  ('Africa/Banjul', 'GM'),
  ('Africa/Bissau', 'GW'),
  ('Africa/Blantyre', 'MW'),
  ('Africa/Brazzaville', 'CG'),
  ('Africa/Bujumbura', 'BI'),
  ('Africa/Cairo', 'EG'),
  ('Africa/Casablanca', 'MA'),
  ('Africa/Ceuta', 'ES'),
  ('Africa/Conakry', 'GN'),
  ('Africa/Dakar', 'SN'),
  ('Africa/Dar_es_Salaam', 'TZ'),
  ('Africa/Djibouti', 'DJ'),
  ('Africa/Douala', 'CM'),
  ('Africa/El_Aaiun', 'EH'),
  ('Africa/Freetown', 'SL'),
  ('Africa/Gaborone', 'BW'),
  ('Africa/Harare', 'ZW'),
  ('Africa/Johannesburg', 'ZA'),
  ('Africa/Juba', 'SS'),
  ('Africa/Kampala', 'UG'),
  ('Africa/Khartoum', 'SD'),
  ('Africa/Kigali', 'RW'),
  ('Africa/Kinshasa', 'CD'),
  ('Africa/Lagos', 'NG'),
  ('Africa/Libreville', 'GA'),
  ('Africa/Lome', 'TG'),
  ('Africa/Luanda', 'AO'),
  ('Africa/Lubumbashi', 'CD'),
  ('Africa/Lusaka', 'ZM'),
  ('Africa/Malabo', 'GQ'),
  ('Africa/Maputo', 'MZ'),
  ('Africa/Maseru', 'LS'),
  ('Africa/Mbabane', 'SZ'),
  ('Africa/Mogadishu', 'SO'),
  ('Africa/Monrovia', 'LR'),
  ('Africa/Nairobi', 'KE'),
  ('Africa/Ndjamena', 'TD'),
  ('Africa/Niamey', 'NE'),
  ('Africa/Nouakchott', 'MR'),
  ('Africa/Ouagadougou', 'BF'),
  ('Africa/Porto-Novo', 'BJ'),
  ('Africa/Sao_Tome', 'ST'),
  ('Africa/Timbuktu', 'ML'),
  ('Africa/Tripoli', 'LY'),
  ('Africa/Tunis', 'TN'),
  ('Africa/Windhoek', 'NA'),
  ('America/Adak', 'US'),
  ('America/Anchorage', 'US'),
  ('America/Anguilla', 'AI'),
  ('America/Antigua', 'AG'),
  ('America/Araguaina', 'BR'),
  ('America/Argentina/Buenos_Aires', 'AR'),
  ('America/Argentina/Catamarca', 'AR'),
  ('America/Argentina/Cordoba', 'AR'),
  ('America/Argentina/Jujuy', 'AR'),
  ('America/Argentina/La_Rioja', 'AR'),
  ('America/Argentina/Mendoza', 'AR'),
  ('America/Argentina/Rio_Gallegos', 'AR'),
  ('America/Argentina/Salta', 'AR'),
  ('America/Argentina/San_Juan', 'AR'),
  ('America/Argentina/San_Luis', 'AR'),
  ('America/Argentina/Tucuman', 'AR'),
  ('America/Argentina/Ushuaia', 'AR'),
  ('America/Aruba', 'AW'),
  ('America/Asuncion', 'PY'),
  ('America/Atikokan', 'CA'),
  ('America/Atka', 'US'),
  ('America/Bahia', 'BR'),
  ('America/Bahia_Banderas', 'MX'),
  ('America/Barbados', 'BB'),
  ('America/Belem', 'BR'),
  ('America/Belize', 'BZ'),
  ('America/Blanc-Sablon', 'CA'),
  ('America/Boa_Vista', 'BR'),
  ('America/Bogota', 'CO'),
  ('America/Boise', 'US'),
  ('America/Buenos_Aires', 'AR'),
  ('America/Cambridge_Bay', 'CA'),
  ('America/Campo_Grande', 'BR'),
  ('America/Cancun', 'MX'),
  ('America/Caracas', 'VE'),
  ('America/Catamarca', 'AR'),
  ('America/Cayenne', 'GF'),
  ('America/Cayman', 'KY'),
  ('America/Chicago', 'US'),
  ('America/Chihuahua', 'MX'),
  ('America/Ciudad_Juarez', 'MX'),
  ('America/Coral_Harbour', 'CA'),
  ('America/Cordoba', 'AR'),
  ('America/Costa_Rica', 'CR'),
  ('America/Coyhaique', 'CL'),
  ('America/Creston', 'CA'),
  ('America/Cuiaba', 'BR'),
  ('America/Curacao', 'CW'),
  ('America/Danmarkshavn', 'GL'),
  ('America/Dawson', 'CA'),
  ('America/Dawson_Creek', 'CA'),
  ('America/Denver', 'US'),
  ('America/Detroit', 'US'),
  ('America/Dominica', 'DM'),
  ('America/Edmonton', 'CA'),
  ('America/Eirunepe', 'BR'),
  ('America/El_Salvador', 'SV'),
  ('America/Ensenada', 'MX'),
  ('America/Fort_Nelson', 'CA'),
  ('America/Fort_Wayne', 'US'),
  ('America/Fortaleza', 'BR'),
  ('America/Glace_Bay', 'CA'),
  ('America/Godthab', 'GL'),
  ('America/Goose_Bay', 'CA'),
  ('America/Grand_Turk', 'TC'),
  ('America/Grenada', 'GD'),
  ('America/Guadeloupe', 'GP'),
  ('America/Guatemala', 'GT'),
  ('America/Guayaquil', 'EC'),
  ('America/Guyana', 'GY'),
  ('America/Halifax', 'CA'),
  ('America/Havana', 'CU'),
  ('America/Hermosillo', 'MX'),
  ('America/Indiana/Indianapolis', 'US'),
  ('America/Indiana/Knox', 'US'),
  ('America/Indiana/Marengo', 'US'),
  ('America/Indiana/Petersburg', 'US'),
  ('America/Indiana/Tell_City', 'US'),
  ('America/Indiana/Vevay', 'US'),
  ('America/Indiana/Vincennes', 'US'),
  ('America/Indiana/Winamac', 'US'),
  ('America/Indianapolis', 'US'),
  ('America/Inuvik', 'CA'),
  ('America/Iqaluit', 'CA'),
  ('America/Jamaica', 'JM'),
  ('America/Jujuy', 'AR'),
  ('America/Juneau', 'US'),
  ('America/Kentucky/Louisville', 'US'),
  ('America/Kentucky/Monticello', 'US'),
  ('America/Knox_IN', 'US'),
  ('America/Kralendijk', 'BQ'),
  ('America/La_Paz', 'BO'),
  ('America/Lima', 'PE'),
  ('America/Los_Angeles', 'US'),
  ('America/Louisville', 'US'),
  ('America/Lower_Princes', 'SX'),
  ('America/Maceio', 'BR'),
  ('America/Managua', 'NI'),
  ('America/Manaus', 'BR'),
  ('America/Marigot', 'MF'),
  ('America/Martinique', 'MQ'),
  ('America/Matamoros', 'MX'),
  ('America/Mazatlan', 'MX'),
  ('America/Mendoza', 'AR'),
  ('America/Menominee', 'US'),
  ('America/Merida', 'MX'),
  ('America/Metlakatla', 'US'),
  ('America/Mexico_City', 'MX'),
  ('America/Miquelon', 'PM'),
  ('America/Moncton', 'CA'),
  ('America/Monterrey', 'MX'),
  ('America/Montevideo', 'UY'),
  ('America/Montreal', 'CA'),
  ('America/Montserrat', 'MS'),
  ('America/Nassau', 'BS'),
  ('America/New_York', 'US'),
  ('America/Nipigon', 'CA'),
  ('America/Nome', 'US'),
  ('America/Noronha', 'BR'),
  ('America/North_Dakota/Beulah', 'US'),
  ('America/North_Dakota/Center', 'US'),
  ('America/North_Dakota/New_Salem', 'US'),
  ('America/Nuuk', 'GL'),
  ('America/Ojinaga', 'MX'),
  ('America/Panama', 'PA'),
  ('America/Pangnirtung', 'CA'),
  ('America/Paramaribo', 'SR'),
  ('America/Phoenix', 'US'),
  ('America/Port-au-Prince', 'HT'),
  ('America/Port_of_Spain', 'TT'),
  ('America/Porto_Acre', 'BR'),
  ('America/Porto_Velho', 'BR'),
  ('America/Puerto_Rico', 'PR'),
  ('America/Punta_Arenas', 'CL'),
  ('America/Rainy_River', 'CA'),
  ('America/Rankin_Inlet', 'CA'),
  ('America/Recife', 'BR'),
  ('America/Regina', 'CA'),
  ('America/Resolute', 'CA'),
  ('America/Rio_Branco', 'BR'),
  ('America/Rosario', 'AR'),
  ('America/Santa_Isabel', 'MX'),
  ('America/Santarem', 'BR'),
  ('America/Santiago', 'CL'),
  ('America/Santo_Domingo', 'DO'),
  ('America/Sao_Paulo', 'BR'),
  ('America/Scoresbysund', 'GL'),
  ('America/Shiprock', 'US'),
  ('America/Sitka', 'US'),
  ('America/St_Barthelemy', 'BL'),
  ('America/St_Johns', 'CA'),
  ('America/St_Kitts', 'KN'),
  ('America/St_Lucia', 'LC'),
  ('America/St_Thomas', 'VI'),
  ('America/St_Vincent', 'VC'),
  ('America/Swift_Current', 'CA'),
  ('America/Tegucigalpa', 'HN'),
  ('America/Thule', 'GL'),
  ('America/Thunder_Bay', 'CA'),
  ('America/Tijuana', 'MX'),
  ('America/Toronto', 'CA'),
  ('America/Tortola', 'VG'),
  ('America/Vancouver', 'CA'),
  ('America/Virgin', 'VI'),
  ('America/Whitehorse', 'CA'),
  ('America/Winnipeg', 'CA'),
  ('America/Yakutat', 'US'),
  ('America/Yellowknife', 'CA'),
  ('Antarctica/Casey', 'AQ'),
  ('Antarctica/Davis', 'AQ'),
  ('Antarctica/DumontDUrville', 'AQ'),
  ('Antarctica/Macquarie', 'AU'),
  ('Antarctica/Mawson', 'AQ'),
  ('Antarctica/McMurdo', 'AQ'),
  ('Antarctica/Palmer', 'AQ'),
  ('Antarctica/Rothera', 'AQ'),
  ('Antarctica/Syowa', 'AQ'),
  ('Antarctica/Troll', 'AQ'),
  ('Antarctica/Vostok', 'AQ'),
  ('Arctic/Longyearbyen', 'SJ'),
  ('Asia/Aden', 'YE'),
  ('Asia/Almaty', 'KZ'),
  ('Asia/Amman', 'JO'),
  ('Asia/Anadyr', 'RU'),
  ('Asia/Aqtau', 'KZ'),
  ('Asia/Aqtobe', 'KZ'),
  ('Asia/Ashgabat', 'TM'),
  ('Asia/Ashkhabad', 'TM'),
  ('Asia/Atyrau', 'KZ'),
  ('Asia/Baghdad', 'IQ'),
  ('Asia/Bahrain', 'BH'),
  ('Asia/Baku', 'AZ'),
  ('Asia/Bangkok', 'TH'),
  ('Asia/Barnaul', 'RU'),
  ('Asia/Beirut', 'LB'),
  ('Asia/Bishkek', 'KG'),
  ('Asia/Brunei', 'BN'),
  ('Asia/Calcutta', 'IN'),
  ('Asia/Chita', 'RU'),
  ('Asia/Chongqing', 'CN'),
  ('Asia/Chungking', 'CN'),
  ('Asia/Colombo', 'LK'),
  ('Asia/Dacca', 'BD'),
  ('Asia/Damascus', 'SY'),
  ('Asia/Dhaka', 'BD'),
  ('Asia/Dili', 'TL'),
  ('Asia/Dubai', 'AE'),
  ('Asia/Dushanbe', 'TJ'),
  ('Asia/Famagusta', 'CY'),
  ('Asia/Gaza', 'PS'),
  ('Asia/Harbin', 'CN'),
  ('Asia/Hebron', 'PS'),
  ('Asia/Ho_Chi_Minh', 'VN'),
  ('Asia/Hong_Kong', 'HK'),
  ('Asia/Hovd', 'MN'),
  ('Asia/Irkutsk', 'RU'),
  ('Asia/Istanbul', 'TR'),
  ('Asia/Jakarta', 'ID'),
  ('Asia/Jayapura', 'ID'),
  ('Asia/Jerusalem', 'IL'),
  ('Asia/Kabul', 'AF'),
  ('Asia/Kamchatka', 'RU'),
  ('Asia/Karachi', 'PK'),
  ('Asia/Kathmandu', 'NP'),
  ('Asia/Katmandu', 'NP'),
  ('Asia/Khandyga', 'RU'),
  ('Asia/Kolkata', 'IN'),
  ('Asia/Krasnoyarsk', 'RU'),
  ('Asia/Kuala_Lumpur', 'MY'),
  ('Asia/Kuching', 'MY'),
  ('Asia/Kuwait', 'KW'),
  ('Asia/Macao', 'MO'),
  ('Asia/Macau', 'MO'),
  ('Asia/Magadan', 'RU'),
  ('Asia/Makassar', 'ID'),
  ('Asia/Manila', 'PH'),
  ('Asia/Muscat', 'OM'),
  ('Asia/Nicosia', 'CY'),
  ('Asia/Novokuznetsk', 'RU'),
  ('Asia/Novosibirsk', 'RU'),
  ('Asia/Omsk', 'RU'),
  ('Asia/Oral', 'KZ'),
  ('Asia/Phnom_Penh', 'KH'),
  ('Asia/Pontianak', 'ID'),
  ('Asia/Pyongyang', 'KP'),
  ('Asia/Qatar', 'QA'),
  ('Asia/Qostanay', 'KZ'),
  ('Asia/Qyzylorda', 'KZ'),
  ('Asia/Rangoon', 'MM'),
  ('Asia/Riyadh', 'SA'),
  ('Asia/Saigon', 'VN'),
  ('Asia/Sakhalin', 'RU'),
  ('Asia/Samarkand', 'UZ'),
  ('Asia/Seoul', 'KR'),
  ('Asia/Shanghai', 'CN'),
  ('Asia/Singapore', 'SG'),
  ('Asia/Srednekolymsk', 'RU'),
  ('Asia/Taipei', 'TW'),
  ('Asia/Tashkent', 'UZ'),
  ('Asia/Tbilisi', 'GE'),
  ('Asia/Tehran', 'IR'),
  ('Asia/Tel_Aviv', 'IL'),
  ('Asia/Thimbu', 'BT'),
  ('Asia/Thimphu', 'BT'),
  ('Asia/Tokyo', 'JP'),
  ('Asia/Tomsk', 'RU'),
  ('Asia/Ujung_Pandang', 'ID'),
  ('Asia/Ulaanbaatar', 'MN'),
  ('Asia/Urumqi', 'CN'),
  ('Asia/Ust-Nera', 'RU'),
  ('Asia/Vientiane', 'LA'),
  ('Asia/Vladivostok', 'RU'),
  ('Asia/Yakutsk', 'RU'),
  ('Asia/Yangon', 'MM'),
  ('Asia/Yekaterinburg', 'RU'),
  ('Asia/Yerevan', 'AM'),
  ('Atlantic/Azores', 'PT'),
  ('Atlantic/Bermuda', 'BM'),
  ('Atlantic/Canary', 'ES'),
  ('Atlantic/Cape_Verde', 'CV'),
  ('Atlantic/Faeroe', 'FO'),
  ('Atlantic/Faroe', 'FO'),
  ('Atlantic/Jan_Mayen', 'SJ'),
  ('Atlantic/Madeira', 'PT'),
  ('Atlantic/Reykjavik', 'IS'),
  ('Atlantic/South_Georgia', 'GS'),
  ('Atlantic/St_Helena', 'SH'),
  ('Atlantic/Stanley', 'FK'),
  ('Australia/ACT', 'AU'),
  ('Australia/Adelaide', 'AU'),
  ('Australia/Brisbane', 'AU'),
  ('Australia/Broken_Hill', 'AU'),
  ('Australia/Canberra', 'AU'),
  ('Australia/Darwin', 'AU'),
  ('Australia/Eucla', 'AU'),
  ('Australia/Hobart', 'AU'),
  ('Australia/LHI', 'AU'),
  ('Australia/Lindeman', 'AU'),
  ('Australia/Lord_Howe', 'AU'),
  ('Australia/Melbourne', 'AU'),
  ('Australia/NSW', 'AU'),
  ('Australia/North', 'AU'),
  ('Australia/Perth', 'AU'),
  ('Australia/Queensland', 'AU'),
  ('Australia/South', 'AU'),
  ('Australia/Sydney', 'AU'),
  ('Australia/Tasmania', 'AU'),
  ('Australia/Victoria', 'AU'),
  ('Australia/West', 'AU'),
  ('Australia/Yancowinna', 'AU'),
  ('Brazil/Acre', 'BR'),
  ('Brazil/DeNoronha', 'BR'),
  ('Brazil/East', 'BR'),
  ('Brazil/West', 'BR'),
  ('Canada/Atlantic', 'CA'),
  ('Canada/Central', 'CA'),
  ('Canada/Eastern', 'CA'),
  ('Canada/Mountain', 'CA'),
  ('Canada/Newfoundland', 'CA'),
  ('Canada/Pacific', 'CA'),
  ('Canada/Saskatchewan', 'CA'),
  ('Canada/Yukon', 'CA'),
  ('Chile/Continental', 'CL'),
  ('Chile/EasterIsland', 'CL'),
  ('Cuba', 'CU'),
  ('Egypt', 'EG'),
  ('Eire', 'IE'),
  ('Europe/Amsterdam', 'NL'),
  ('Europe/Andorra', 'AD'),
  ('Europe/Astrakhan', 'RU'),
  ('Europe/Athens', 'GR'),
  ('Europe/Belfast', 'GB'),
  ('Europe/Belgrade', 'RS'),
  ('Europe/Berlin', 'DE'),
  ('Europe/Bratislava', 'SK'),
  ('Europe/Brussels', 'BE'),
  ('Europe/Bucharest', 'RO'),
  ('Europe/Budapest', 'HU'),
  ('Europe/Busingen', 'DE'),
  ('Europe/Chisinau', 'MD'),
  ('Europe/Copenhagen', 'DK'),
  ('Europe/Dublin', 'IE'),
  ('Europe/Gibraltar', 'GI'),
  ('Europe/Guernsey', 'GG'),
  ('Europe/Helsinki', 'FI'),
  ('Europe/Isle_of_Man', 'IM'),
  ('Europe/Istanbul', 'TR'),
  ('Europe/Jersey', 'JE'),
  ('Europe/Kaliningrad', 'RU'),
  ('Europe/Kiev', 'UA'),
  ('Europe/Kirov', 'RU'),
  ('Europe/Kyiv', 'UA'),
  ('Europe/Lisbon', 'PT'),
  ('Europe/Ljubljana', 'SI'),
  ('Europe/London', 'GB'),
  ('Europe/Luxembourg', 'LU'),
  ('Europe/Madrid', 'ES'),
  ('Europe/Malta', 'MT'),
  ('Europe/Mariehamn', 'AX'),
  ('Europe/Minsk', 'BY'),
  ('Europe/Monaco', 'MC'),
  ('Europe/Moscow', 'RU'),
  ('Europe/Nicosia', 'CY'),
  ('Europe/Oslo', 'NO'),
  ('Europe/Paris', 'FR'),
  ('Europe/Podgorica', 'ME'),
  ('Europe/Prague', 'CZ'),
  ('Europe/Riga', 'LV'),
  ('Europe/Rome', 'IT'),
  ('Europe/Samara', 'RU'),
  ('Europe/San_Marino', 'SM'),
  ('Europe/Sarajevo', 'BA'),
  ('Europe/Saratov', 'RU'),
  ('Europe/Simferopol', 'UA'),
  ('Europe/Skopje', 'MK'),
  ('Europe/Sofia', 'BG'),
  ('Europe/Stockholm', 'SE'),
  ('Europe/Tallinn', 'EE'),
  ('Europe/Tirane', 'AL'),
  ('Europe/Ulyanovsk', 'RU'),
  ('Europe/Uzhgorod', 'UA'),
  ('Europe/Vaduz', 'LI'),
  ('Europe/Vatican', 'VA'),
  ('Europe/Vienna', 'AT'),
  ('Europe/Vilnius', 'LT'),
  ('Europe/Volgograd', 'RU'),
  ('Europe/Warsaw', 'PL'),
  ('Europe/Zagreb', 'HR'),
  ('Europe/Zaporozhye', 'UA'),
  ('Europe/Zurich', 'CH'),
  ('GB', 'GB'),
  ('GB-Eire', 'GB'),
  ('Hongkong', 'HK'),
  ('Iceland', 'IS'),
  ('Indian/Antananarivo', 'MG'),
  ('Indian/Chagos', 'IO'),
  ('Indian/Christmas', 'CX'),
  ('Indian/Cocos', 'CC'),
  ('Indian/Comoro', 'KM'),
  ('Indian/Kerguelen', 'TF'),
  ('Indian/Mahe', 'SC'),
  ('Indian/Maldives', 'MV'),
  ('Indian/Mauritius', 'MU'),
  ('Indian/Mayotte', 'YT'),
  ('Indian/Reunion', 'RE'),
  ('Iran', 'IR'),
  ('Israel', 'IL'),
  ('Jamaica', 'JM'),
  ('Japan', 'JP'),
  ('Kwajalein', 'MH'),
  ('Libya', 'LY'),
  ('Mexico/BajaNorte', 'MX'),
  ('Mexico/BajaSur', 'MX'),
  ('Mexico/General', 'MX'),
  ('NZ', 'NZ'),
  ('NZ-CHAT', 'NZ'),
  ('Navajo', 'US'),
  ('PRC', 'CN'),
  ('Pacific/Apia', 'WS'),
  ('Pacific/Auckland', 'NZ'),
  ('Pacific/Bougainville', 'PG'),
  ('Pacific/Chatham', 'NZ'),
  ('Pacific/Chuuk', 'FM'),
  ('Pacific/Easter', 'CL'),
  ('Pacific/Efate', 'VU'),
  ('Pacific/Enderbury', 'KI'),
  ('Pacific/Fakaofo', 'TK'),
  ('Pacific/Fiji', 'FJ'),
  ('Pacific/Funafuti', 'TV'),
  ('Pacific/Galapagos', 'EC'),
  ('Pacific/Gambier', 'PF'),
  ('Pacific/Guadalcanal', 'SB'),
  ('Pacific/Guam', 'GU'),
  ('Pacific/Honolulu', 'US'),
  ('Pacific/Johnston', 'UM'),
  ('Pacific/Kanton', 'KI'),
  ('Pacific/Kiritimati', 'KI'),
  ('Pacific/Kosrae', 'FM'),
  ('Pacific/Kwajalein', 'MH'),
  ('Pacific/Majuro', 'MH'),
  ('Pacific/Marquesas', 'PF'),
  ('Pacific/Midway', 'UM'),
  ('Pacific/Nauru', 'NR'),
  ('Pacific/Niue', 'NU'),
  ('Pacific/Norfolk', 'NF'),
  ('Pacific/Noumea', 'NC'),
  ('Pacific/Pago_Pago', 'AS'),
  ('Pacific/Palau', 'PW'),
  ('Pacific/Pitcairn', 'PN'),
  ('Pacific/Pohnpei', 'FM'),
  ('Pacific/Ponape', 'FM'),
  ('Pacific/Port_Moresby', 'PG'),
  ('Pacific/Rarotonga', 'CK'),
  ('Pacific/Saipan', 'MP'),
  ('Pacific/Samoa', 'AS'),
  ('Pacific/Tahiti', 'PF'),
  ('Pacific/Tarawa', 'KI'),
  ('Pacific/Tongatapu', 'TO'),
  ('Pacific/Truk', 'FM'),
  ('Pacific/Wake', 'UM'),
  ('Pacific/Wallis', 'WF'),
  ('Pacific/Yap', 'FM'),
  ('Poland', 'PL'),
  ('Portugal', 'PT'),
  ('ROC', 'TW'),
  ('ROK', 'KR'),
  ('Singapore', 'SG'),
  ('Turkey', 'TR'),
  ('US/Alaska', 'US'),
  ('US/Aleutian', 'US'),
  ('US/Arizona', 'US'),
  ('US/Central', 'US'),
  ('US/East-Indiana', 'US'),
  ('US/Eastern', 'US'),
  ('US/Hawaii', 'US'),
  ('US/Indiana-Starke', 'US'),
  ('US/Michigan', 'US'),
  ('US/Mountain', 'US'),
  ('US/Pacific', 'US'),
  ('US/Samoa', 'AS')
on conflict (time_zone) do update set country_code = excluded.country_code;

alter table public.timezone_locations enable row level security;
-- Deliberately no policies: this reference table is read only by the
-- SECURITY DEFINER report function below, never directly by a client.

-- ---------------------------------------------------------------------------
-- app_admins — allowlist gating the distribution report.
--
-- Seed it by hand, once, in the SQL editor:
--   insert into public.app_admins (user_id)
--   select id from auth.users where email = 'you@example.com'
--   on conflict do nothing;
-- ---------------------------------------------------------------------------

create table if not exists public.app_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  added_at timestamptz not null default now()
);

alter table public.app_admins enable row level security;
-- Deliberately no policies: unreadable and unwritable from any client, so
-- nobody can discover who the admins are or add themselves. Only the
-- SECURITY DEFINER helper below reads it.

-- Reports only on the caller, so it is safe to expose to any signed-in user —
-- the app calls it to decide whether to show the Settings entry.
create or replace function public.is_app_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from public.app_admins where user_id = auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- user_distribution_stats — the single source of truth for the report.
-- Aggregate counts only: never a user id, display name, or email. Users who
-- opted out of locale sharing, or who haven't reported yet, collapse into one
-- all-null bucket, which is what makes the coverage figure honest without
-- exposing anyone.
--
-- Deliberately NOT security_invoker: the view runs as its owner so it can
-- aggregate across all profiles despite RLS. That is exactly why the grants
-- below matter — they, not RLS, are what keep it out of clients' hands.
-- Two consumers read it, and both must see identical numbers:
--   * the in-app screen, via user_distribution_report() (admin-gated), and
--   * scripts/user-distribution-report.mjs, which connects as service_role
--     and selects from it directly. service_role has no auth.uid(), so it
--     could never pass the admin check — it needs this direct path.
-- ---------------------------------------------------------------------------

create or replace view public.user_distribution_stats as
  select
    -- Time-zone-derived country first; the device Region setting is only a
    -- fallback for zones we don't recognise. See the note on the table above.
    case when p.locale_sharing then coalesce(tl.country_code, p.region_code) end as region_code,
    case when p.locale_sharing then tl.region end     as region,
    case when p.locale_sharing then tl.city end       as city,
    case when p.locale_sharing then p.time_zone end   as time_zone,
    count(*)::int                                     as user_count
  from public.profiles p
  left join public.timezone_locations tl on tl.time_zone = p.time_zone
  group by 1, 2, 3, 4;

revoke all on public.user_distribution_stats from public, anon, authenticated;
grant select on public.user_distribution_stats to service_role;

create or replace function public.user_distribution_report()
returns table (region_code text, region text, city text, time_zone text, user_count int)
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if not public.is_app_admin() then
    raise exception 'Not authorized.';
  end if;

  return query select s.region_code, s.region, s.city, s.time_zone, s.user_count
               from public.user_distribution_stats s;
end;
$$;

-- EXECUTE on a new function is granted to PUBLIC by default, and `anon`
-- inherits that — so revoking from `anon` alone would be a no-op. Revoke from
-- PUBLIC, then grant back only to the roles that should have it.
revoke all on function public.user_distribution_report() from public, anon;
grant execute on function public.user_distribution_report() to authenticated;

-- is_app_admin() only ever reports on the caller, so authenticated may call
-- it; anon has no use for it.
revoke all on function public.is_app_admin() from public, anon;
grant execute on function public.is_app_admin() to authenticated;
