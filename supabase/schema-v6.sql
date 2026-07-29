-- Baiolo schema v6: free / pro / studio + monthly AI usage
-- Safe to re-run (idempotent where possible).

-- Extend upload_type enum (original schema only had zip/link/template)
ALTER TYPE public.upload_type ADD VALUE IF NOT EXISTS 'html';
ALTER TYPE public.upload_type ADD VALUE IF NOT EXISTS 'ai';

-- Migrate legacy plan values
update public.profiles
set plan = 'pro'
where plan in ('paid', 'paid_basic', 'paid_pro');

alter table public.profiles
  alter column plan set default 'free';

DO $$
DECLARE
  v_plan_attnum int;
  con record;
BEGIN
  SELECT attnum INTO v_plan_attnum
  FROM pg_attribute
  WHERE attrelid = 'public.profiles'::regclass
    AND attname = 'plan';

  IF v_plan_attnum IS NULL THEN
    RETURN;
  END IF;

  FOR con IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass
      AND contype = 'c'
      AND v_plan_attnum = ANY(conkey)
  LOOP
    EXECUTE format('ALTER TABLE public.profiles DROP CONSTRAINT %I', con.conname);
  END LOOP;
END$$;

alter table public.profiles
  add constraint profiles_plan_check
  check (plan in ('free', 'pro', 'studio'));

alter table public.profiles
  add column if not exists plan_renewed_at timestamptz default now();

create table if not exists public.ai_generation_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  period_start date not null,
  generations_used int not null default 0,
  unique (user_id, period_start)
);

alter table public.projects
  add column if not exists source_type text not null default 'external';

alter table public.projects
  drop constraint if exists projects_source_type_check;

alter table public.projects
  add constraint projects_source_type_check
  check (source_type in ('ai_build', 'zip', 'link', 'html_starter', 'external'));

alter table public.projects
  add column if not exists ai_slot_active boolean default false;

-- Cast enum → text so CASE never tries to cast unknown labels into the enum
update public.projects
set source_type = case upload_type::text
  when 'ai' then 'ai_build'
  when 'zip' then 'zip'
  when 'link' then 'link'
  when 'html' then 'html_starter'
  when 'template' then 'html_starter'
  else 'external'
end
where source_type = 'external' or source_type is null;

update public.projects
set ai_slot_active = (source_type = 'ai_build')
where source_type = 'ai_build';
