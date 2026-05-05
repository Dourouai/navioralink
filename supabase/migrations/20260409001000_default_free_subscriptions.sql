create unique index if not exists subscriptions_one_system_free_per_user_idx
  on public.subscriptions (user_id)
  where provider = 'system' and plan_code = 'free';

create or replace function public.ensure_default_free_subscription()
returns public.subscriptions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_subscription public.subscriptions%rowtype;
begin
  if v_user_id is null then
    raise exception 'You need to sign in first.';
  end if;

  select *
  into v_subscription
  from public.subscriptions
  where user_id = v_user_id
  order by updated_at desc nulls last, created_at desc nulls last
  limit 1;

  if found then
    return v_subscription;
  end if;

  insert into public.subscriptions (
    user_id,
    provider,
    plan_code,
    status,
    current_period_start,
    current_period_end,
    cancel_at_period_end
  )
  values (
    v_user_id,
    'system',
    'free',
    'active',
    timezone('utc', now()),
    null,
    false
  )
  on conflict do nothing
  returning *
  into v_subscription;

  if v_subscription.id is null then
    select *
    into v_subscription
    from public.subscriptions
    where user_id = v_user_id
    order by updated_at desc nulls last, created_at desc nulls last
    limit 1;
  end if;

  return v_subscription;
end;
$$;

insert into public.subscriptions (
  user_id,
  provider,
  plan_code,
  status,
  current_period_start,
  current_period_end,
  cancel_at_period_end
)
select
  users.id,
  'system',
  'free',
  'active',
  timezone('utc', now()),
  null,
  false
from auth.users as users
where not exists (
  select 1
  from public.subscriptions
  where subscriptions.user_id = users.id
)
on conflict do nothing;
