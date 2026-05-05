create or replace function public.get_plan_entry_limit(raw_plan_code text)
returns integer
language sql
immutable
as $$
  select case public.normalize_plan_code(raw_plan_code)
    when 'starter' then 100
    when 'premium' then 1000
    else 3
  end;
$$;

create or replace function public.get_plan_monthly_visit_limit(raw_plan_code text)
returns integer
language sql
immutable
as $$
  select case public.normalize_plan_code(raw_plan_code)
    when 'starter' then 100000
    when 'premium' then 300000
    else 500
  end;
$$;
