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

create policy "Users can view their own profile"
  on public.profiles for select
  using (id = auth.uid());

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

create policy "Owners can view their own tasks"
  on public.tasks for select
  using (creator_id = auth.uid());

create policy "Owners can create their own personal tasks"
  on public.tasks for insert
  with check (
    creator_id = auth.uid()
    and assignee_id = auth.uid()
    and origin = 'personal'
  );

create policy "Owners can update their own tasks"
  on public.tasks for update
  using (creator_id = auth.uid());

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
