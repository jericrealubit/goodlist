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

create or replace function public.create_household(p_name text)
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

  insert into public.families (name, created_by)
  values (p_name, auth.uid())
  returning id into v_family_id;

  insert into public.family_members (family_id, user_id, role)
  values (v_family_id, auth.uid(), 'owner');

  return v_family_id;
end;
$$;

create or replace function public.join_household(p_invite_code text)
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

  select id into v_family_id from public.families where invite_code = upper(p_invite_code);
  if v_family_id is null then
    raise exception 'Invalid invite code.';
  end if;

  insert into public.family_members (family_id, user_id, role)
  values (v_family_id, auth.uid(), 'member');

  return v_family_id;
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
create policy "Members can view their own or assigned tasks"
  on public.tasks for select
  using (creator_id = auth.uid() or assignee_id = auth.uid());

drop policy if exists "Owners can update their own tasks" on public.tasks;
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
