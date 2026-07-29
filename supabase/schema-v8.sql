-- Baiolo schema v8: tighten profiles RLS (users see own row; no client self-promote to admin)
-- Safe to re-run. Service-role admin APIs bypass RLS.

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
drop policy if exists "profiles_admin_all" on public.profiles;
drop policy if exists "profiles_admin_select" on public.profiles;
drop policy if exists "profiles_admin_update" on public.profiles;
drop policy if exists "profiles_upsert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

-- Authenticated users can read their own profile only.
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

-- Admins via JWT app_metadata.role can read all profiles from the client.
create policy "profiles_admin_select"
  on public.profiles for select
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "profiles_admin_update"
  on public.profiles for update
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "profiles_upsert_own"
  on public.profiles for insert
  with check (
    auth.uid() = id
    and role is distinct from 'admin'
  );

-- Own-row updates allowed, but role cannot become admin via the client.
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role is distinct from 'admin'
  );
