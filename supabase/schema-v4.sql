-- Baiolo schema v4: visibility, shared_with, member plan stub

alter table public.projects
  add column if not exists visibility text default 'private'
    check (visibility in ('private', 'pending_public', 'public'));

alter table public.projects
  add column if not exists shared_with text[] default '{}';

alter table public.profiles
  add column if not exists plan text default 'free'
    check (plan in ('free', 'paid'));

comment on column public.projects.visibility is
  'private = creator play; pending_public = admin queue; public = Explore';

comment on column public.projects.shared_with is
  'Emails invited to play private builds';
