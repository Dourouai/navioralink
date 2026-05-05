create or replace function public.normalize_plan_code(raw_plan_code text)
returns text
language sql
immutable
as $$
  select case lower(coalesce(trim(raw_plan_code), ''))
    when 'starter' then 'starter'
    when 'premium' then 'premium'
    when 'pro' then 'premium'
    else 'free'
  end;
$$;

create or replace function public.has_active_subscription_access(raw_status text, period_end timestamptz)
returns boolean
language sql
stable
as $$
  select lower(coalesce(trim(raw_status), '')) in ('active', 'trialing', 'past_due')
    and (period_end is null or period_end >= timezone('utc', now()));
$$;

create or replace function public.get_effective_plan_code(p_user_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  latest_subscription public.subscriptions%rowtype;
begin
  select *
  into latest_subscription
  from public.subscriptions
  where user_id = p_user_id
  order by updated_at desc nulls last, created_at desc nulls last
  limit 1;

  if not found then
    return 'free';
  end if;

  if public.has_active_subscription_access(latest_subscription.status, latest_subscription.current_period_end) then
    return public.normalize_plan_code(latest_subscription.plan_code);
  end if;

  return 'free';
end;
$$;

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
    when 'starter' then null
    when 'premium' then null
    else 500
  end;
$$;

create or replace function public.pause_entries_over_plan_limit(p_user_id uuid)
returns uuid[]
language plpgsql
security definer
set search_path = public
as $$
declare
  allowed_entries integer;
  paused_ids uuid[];
begin
  allowed_entries := public.get_plan_entry_limit(public.get_effective_plan_code(p_user_id));

  with overflow_entries as (
    select id
    from public.entries
    where user_id = p_user_id
      and status <> 'archived'
    order by created_at desc nulls last, id desc
    offset allowed_entries
  ),
  updated_entries as (
    update public.entries
    set status = 'paused'
    where id in (select id from overflow_entries)
      and status <> 'paused'
    returning id
  )
  select coalesce(array_agg(id), '{}') into paused_ids
  from updated_entries;

  return coalesce(paused_ids, '{}');
end;
$$;

create or replace function public.enforce_entry_plan_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  allowed_entries integer;
  visible_entries integer;
begin
  if new.user_id is null or new.status = 'archived' then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.status <> 'archived' then
    return new;
  end if;

  allowed_entries := public.get_plan_entry_limit(public.get_effective_plan_code(new.user_id));

  select count(*)
  into visible_entries
  from public.entries
  where user_id = new.user_id
    and status <> 'archived';

  if visible_entries >= allowed_entries then
    raise exception 'PLAN_ENTRY_LIMIT_EXCEEDED'
      using errcode = 'P0001',
            detail = format('plan=%s;limit=%s', public.get_effective_plan_code(new.user_id), allowed_entries);
  end if;

  return new;
end;
$$;

create or replace function public.sync_subscription_plan_constraints()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user_id uuid;
begin
  target_user_id := coalesce(new.user_id, old.user_id);

  if target_user_id is not null then
    perform public.pause_entries_over_plan_limit(target_user_id);
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists entries_enforce_plan_limit on public.entries;
create trigger entries_enforce_plan_limit
before insert or update of status on public.entries
for each row execute procedure public.enforce_entry_plan_limit();

drop trigger if exists subscriptions_sync_plan_constraints on public.subscriptions;
create trigger subscriptions_sync_plan_constraints
after insert or update or delete on public.subscriptions
for each row execute procedure public.sync_subscription_plan_constraints();
