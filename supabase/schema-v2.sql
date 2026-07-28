-- Baiolo schema v2 (run AFTER schema.sql if already applied)
-- Adds profiles, engagement, play_url, and storage-ready fields.

alter table public.projects
  add column if not exists play_url text;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  name text not null default 'Friend',
  avatar text not null default '🟣',
  role text not null default 'explorer'
    check (role in ('guest', 'explorer', 'creator', 'admin')),
  interests text[] not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_upsert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

create policy "profiles_admin_all"
  on public.profiles for all
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create table if not exists public.project_engagement (
  project_id text not null references public.projects (id) on delete cascade,
  user_key text not null,
  reaction text,
  feedback_notes text[] not null default '{}',
  reported boolean not null default false,
  plays integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (project_id, user_key)
);

alter table public.project_engagement enable row level security;

-- Service role bypasses RLS; anon/authenticated can read own rows by user_key convention.
create policy "engagement_select_own"
  on public.project_engagement for select
  using (
    user_key = coalesce(auth.uid()::text, '')
    or user_key like 'anon:%'
  );

create policy "engagement_upsert_own"
  on public.project_engagement for insert
  with check (true);

create policy "engagement_update_own"
  on public.project_engagement for update
  using (true);

-- Storage buckets (also create in Dashboard → Storage if SQL can't):
-- insert into storage.buckets (id, name, public) values
--   ('project-private', 'project-private', false),
--   ('project-public', 'project-public', true)
-- on conflict do nothing;

-- Optional: mark a user as admin in SQL:
-- update auth.users
-- set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
-- where email = 'you@example.com';
