-- Baiolo schema v9: admin helpers + hardened profiles RLS (no recursive policies)
-- Safe to re-run. Service role bypasses RLS for server admin APIs.

create or replace function public.is_baiolo_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;

revoke all on function public.is_baiolo_admin() from public;
grant execute on function public.is_baiolo_admin() to authenticated;

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
drop policy if exists "profiles_admin_all" on public.profiles;
drop policy if exists "profiles_admin_select" on public.profiles;
drop policy if exists "profiles_admin_update" on public.profiles;
drop policy if exists "profiles_upsert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "select_own_or_admin" on public.profiles;
drop policy if exists "update_own_or_admin" on public.profiles;
drop policy if exists "delete_admin_only" on public.profiles;
drop policy if exists "profiles_admin_delete" on public.profiles;

create policy "profiles_select_own_or_admin"
  on public.profiles for select
  using (auth.uid() = id or public.is_baiolo_admin());

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (
    auth.uid() = id
    and role is distinct from 'admin'
  );

-- Non-admins may update their own row but cannot become admin via client.
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id and not public.is_baiolo_admin())
  with check (
    auth.uid() = id
    and role is distinct from 'admin'
  );

create policy "profiles_admin_update"
  on public.profiles for update
  using (public.is_baiolo_admin());

create policy "profiles_admin_delete"
  on public.profiles for delete
  using (public.is_baiolo_admin());
