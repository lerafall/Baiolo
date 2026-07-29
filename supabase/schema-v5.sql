-- Baiolo schema v5: free + two paid plans
-- Adds: paid_basic, paid_pro

-- Map legacy paid -> paid_basic (backward compatible with schema v4)
update public.profiles
set plan = 'paid_basic'
where plan = 'paid';

-- Ensure default exists
alter table public.profiles
  alter column plan set default 'free';

-- Drop any existing check constraints that apply to column `plan`
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

-- Add the new check constraint
alter table public.profiles
  add constraint profiles_plan_check
  check (plan in ('free', 'paid_basic', 'paid_pro'));

