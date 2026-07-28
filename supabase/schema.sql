-- Baiolo projects + moderation (Supabase-ready)
-- Run in Supabase SQL editor when connecting a real project.
-- Dashboard → SQL → New query → paste this file → Run

create type public.project_status as enum (
  'draft',
  'submitted',
  'checking',
  'needs_changes',
  'in_review',
  'approved',
  'published',
  'rejected'
);

create type public.risk_level as enum ('low', 'medium', 'high');

create type public.upload_type as enum ('zip', 'link', 'template');

-- Text ids match the current Next.js MVP (draft-…, cloud-hopper, etc.)
create table public.projects (
  id text primary key,
  owner_id uuid references auth.users (id) on delete cascade,
  upload_type public.upload_type,
  source_label text not null default '',
  title text not null default '',
  description text not null default '',
  category text check (category in ('game', 'tool', 'experiment', 'demo')),
  tags text[] not null default '{}',
  thumbnail_path text,
  storage_path text,
  status public.project_status not null default 'draft',
  risk public.risk_level,
  ai_flags text[] not null default '{}',
  change_request text,
  plays integer not null default 0,
  reactions integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create table public.moderation_events (
  id uuid primary key default gen_random_uuid(),
  project_id text not null references public.projects (id) on delete cascade,
  actor_id uuid references auth.users (id),
  action text not null,
  note text,
  risk public.risk_level,
  created_at timestamptz not null default now()
);

-- Private bucket for uploads before approve (create in Storage UI):
-- bucket id: project-private, public: false
-- Public bucket after approve: project-public

alter table public.projects enable row level security;
alter table public.moderation_events enable row level security;

-- Owners manage own drafts; everyone reads published only.
create policy "owners_select_own"
  on public.projects for select
  using (auth.uid() = owner_id or status = 'published');

create policy "owners_insert_own"
  on public.projects for insert
  with check (auth.uid() = owner_id);

create policy "owners_update_own_draftish"
  on public.projects for update
  using (
    auth.uid() = owner_id
    and status in ('draft', 'needs_changes')
  );

-- Admin role via JWT claim app_metadata.role = 'admin' (configure separately)
create policy "admins_all_projects"
  on public.projects for all
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Service role (server routes with SUPABASE_SERVICE_ROLE_KEY) bypasses RLS.
-- Until auth is wired, server APIs use the service role key from .env.local.
