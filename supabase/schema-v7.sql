-- Baiolo schema v7: atomic AI generation consume (prevents over-limit / races)
-- Safe to re-run.

create table if not exists public.ai_generation_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  period_start date not null,
  generations_used int not null default 0,
  unique (user_id, period_start)
);

alter table public.ai_generation_usage
  drop constraint if exists ai_generation_usage_non_negative;

alter table public.ai_generation_usage
  add constraint ai_generation_usage_non_negative
  check (generations_used >= 0);

/**
 * Atomically reserve one AI generation for the billing period.
 * Returns allowed=false when already at/over limit (used is never incremented past p_limit).
 */
create or replace function public.try_consume_ai_generation(
  p_user_id uuid,
  p_period_start date,
  p_limit int
) returns table(allowed boolean, used int)
language plpgsql
as $$
declare
  v_used int;
begin
  if p_limit is null or p_limit < 0 then
    return query select false, 0;
    return;
  end if;

  insert into public.ai_generation_usage (user_id, period_start, generations_used)
  values (p_user_id, p_period_start, 0)
  on conflict (user_id, period_start) do nothing;

  select generations_used into v_used
  from public.ai_generation_usage
  where user_id = p_user_id and period_start = p_period_start
  for update;

  if v_used is null then
    return query select false, 0;
    return;
  end if;

  if v_used >= p_limit then
    return query select false, v_used;
    return;
  end if;

  update public.ai_generation_usage
  set generations_used = generations_used + 1
  where user_id = p_user_id and period_start = p_period_start
  returning generations_used into v_used;

  return query select true, v_used;
end;
$$;

/** Undo a reserved generation when the model call fails after consume. */
create or replace function public.refund_ai_generation(
  p_user_id uuid,
  p_period_start date
) returns int
language plpgsql
as $$
declare
  v_used int;
begin
  update public.ai_generation_usage
  set generations_used = greatest(0, generations_used - 1)
  where user_id = p_user_id and period_start = p_period_start
  returning generations_used into v_used;

  return coalesce(v_used, 0);
end;
$$;

grant execute on function public.try_consume_ai_generation(uuid, date, int) to service_role;
grant execute on function public.refund_ai_generation(uuid, date) to service_role;
