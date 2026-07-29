-- Baiolo schema v3 — admin review gate before publish
-- Run AFTER schema-v2.sql in Supabase SQL editor.

alter table public.projects
  add column if not exists preview_url text;

alter table public.projects
  add column if not exists code_checked_at timestamptz;

alter table public.projects
  add column if not exists play_checked_at timestamptz;

alter table public.projects
  add column if not exists review_notes text;
