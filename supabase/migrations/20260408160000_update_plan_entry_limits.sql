create or replace function public.get_plan_entry_limit(raw_plan_code text)
returns integer
language sql
immutable
as $$
  select case public.normalize_plan_code(raw_plan_code)
    when 'starter' then 1000
    when 'premium' then 10000
    else 3
  end;
$$;
