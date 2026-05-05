create table if not exists public.activation_codes (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,
  code_prefix text not null,
  display_name text,
  plan_code text not null,
  billing_cycle text not null default 'monthly',
  duration_months integer not null,
  max_redemptions integer not null default 1,
  redeemed_count integer not null default 0,
  status text not null default 'active',
  expires_at timestamptz,
  last_redeemed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.activation_code_redemptions (
  id uuid primary key default gen_random_uuid(),
  activation_code_id uuid not null references public.activation_codes (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  subscription_id uuid not null references public.subscriptions (id) on delete cascade,
  code_prefix text not null,
  plan_code text not null,
  billing_cycle text not null,
  duration_months integer not null,
  redeemed_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists activation_codes_code_hash_idx
on public.activation_codes (code_hash);

create index if not exists activation_codes_status_expires_at_idx
on public.activation_codes (status, expires_at);

create unique index if not exists activation_code_redemptions_code_user_idx
on public.activation_code_redemptions (activation_code_id, user_id);

create index if not exists activation_code_redemptions_user_id_redeemed_at_idx
on public.activation_code_redemptions (user_id, redeemed_at desc);

drop trigger if exists activation_codes_set_updated_at on public.activation_codes;
create trigger activation_codes_set_updated_at
before update on public.activation_codes
for each row execute procedure public.set_updated_at();

alter table public.activation_codes enable row level security;
alter table public.activation_code_redemptions enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'activation_code_redemptions'
      and policyname = 'activation_code_redemptions_owner_read'
  ) then
    create policy "activation_code_redemptions_owner_read"
    on public.activation_code_redemptions
    for select
    using (auth.uid() = user_id);
  end if;
end;
$$;

create or replace function public.normalize_activation_code(raw_code text)
returns text
language sql
immutable
as $$
  select upper(regexp_replace(coalesce(raw_code, ''), '[^A-Za-z0-9]+', '', 'g'));
$$;

create or replace function public.hash_activation_code(raw_code text)
returns text
language sql
immutable
as $$
  select encode(digest(public.normalize_activation_code(raw_code), 'sha256'), 'hex');
$$;

create or replace function public.issue_activation_code(
  input_plan_code text,
  input_billing_cycle text default 'monthly',
  input_duration_months integer default null,
  input_max_redemptions integer default 1,
  input_expires_at timestamptz default null,
  input_display_name text default null,
  input_notes text default null
)
returns table (
  id uuid,
  code text,
  code_prefix text,
  plan_code text,
  billing_cycle text,
  duration_months integer,
  max_redemptions integer,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan_code text := public.normalize_plan_code(input_plan_code);
  v_billing_cycle text := case
    when lower(coalesce(trim(input_billing_cycle), 'monthly')) = 'yearly' then 'yearly'
    else 'monthly'
  end;
  v_duration_months integer := greatest(coalesce(input_duration_months, case when v_billing_cycle = 'yearly' then 12 else 1 end), 1);
  v_generated text;
  v_code_prefix text;
  v_row public.activation_codes%rowtype;
begin
  if v_plan_code not in ('starter', 'premium') then
    raise exception 'ACTIVATION_CODE_PLAN_INVALID'
      using errcode = 'P0001';
  end if;

  if coalesce(input_max_redemptions, 0) < 1 then
    raise exception 'ACTIVATION_CODE_MAX_REDEMPTIONS_INVALID'
      using errcode = 'P0001';
  end if;

  loop
    v_generated := upper(encode(gen_random_bytes(6), 'hex'));
    v_generated := format('NAV-%s-%s-%s', substr(v_generated, 1, 4), substr(v_generated, 5, 4), substr(v_generated, 9, 4));
    exit when not exists (
      select 1
      from public.activation_codes
      where code_hash = public.hash_activation_code(v_generated)
    );
  end loop;

  v_code_prefix := replace(split_part(v_generated, '-', 2) || '-' || split_part(v_generated, '-', 3), '--', '-');

  insert into public.activation_codes (
    code_hash,
    code_prefix,
    display_name,
    plan_code,
    billing_cycle,
    duration_months,
    max_redemptions,
    expires_at,
    notes
  )
  values (
    public.hash_activation_code(v_generated),
    v_code_prefix,
    nullif(trim(input_display_name), ''),
    v_plan_code,
    v_billing_cycle,
    v_duration_months,
    input_max_redemptions,
    input_expires_at,
    nullif(trim(input_notes), '')
  )
  returning * into v_row;

  return query
  select
    v_row.id,
    v_generated,
    v_row.code_prefix,
    v_row.plan_code,
    v_row.billing_cycle,
    v_row.duration_months,
    v_row.max_redemptions,
    v_row.expires_at;
end;
$$;

revoke all on function public.issue_activation_code(text, text, integer, integer, timestamptz, text, text) from public;
revoke all on function public.issue_activation_code(text, text, integer, integer, timestamptz, text, text) from anon;
revoke all on function public.issue_activation_code(text, text, integer, integer, timestamptz, text, text) from authenticated;
grant execute on function public.issue_activation_code(text, text, integer, integer, timestamptz, text, text) to service_role;

create or replace function public.redeem_activation_code(
  input_user_id uuid,
  input_code text
)
returns table (
  subscription_id uuid,
  plan_code text,
  billing_cycle text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  provider text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := timezone('utc', now());
  v_normalized_code text := public.normalize_activation_code(input_code);
  v_code public.activation_codes%rowtype;
  v_subscription public.subscriptions%rowtype;
  v_redemption_id uuid := gen_random_uuid();
  v_period_end timestamptz;
begin
  if input_user_id is null then
    raise exception 'ACTIVATION_CODE_AUTH_REQUIRED'
      using errcode = 'P0001';
  end if;

  if v_normalized_code = '' then
    raise exception 'ACTIVATION_CODE_REQUIRED'
      using errcode = 'P0001';
  end if;

  select *
  into v_code
  from public.activation_codes
  where code_hash = public.hash_activation_code(v_normalized_code)
  for update;

  if not found then
    raise exception 'ACTIVATION_CODE_INVALID'
      using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from public.activation_code_redemptions
    where activation_code_id = v_code.id
      and user_id = input_user_id
  ) then
    raise exception 'ACTIVATION_CODE_ALREADY_REDEEMED'
      using errcode = 'P0001';
  end if;

  if v_code.expires_at is not null and v_code.expires_at < v_now then
    raise exception 'ACTIVATION_CODE_EXPIRED'
      using errcode = 'P0001';
  end if;

  if coalesce(v_code.status, 'active') not in ('active', 'issued') then
    raise exception 'ACTIVATION_CODE_UNAVAILABLE'
      using errcode = 'P0001';
  end if;

  if v_code.redeemed_count >= v_code.max_redemptions then
    raise exception 'ACTIVATION_CODE_LIMIT_REACHED'
      using errcode = 'P0001';
  end if;

  v_period_end := v_now + make_interval(months => greatest(coalesce(v_code.duration_months, case when v_code.billing_cycle = 'yearly' then 12 else 1 end), 1));

  insert into public.subscriptions (
    user_id,
    provider,
    provider_customer_id,
    provider_subscription_id,
    plan_code,
    status,
    current_period_start,
    current_period_end,
    cancel_at_period_end
  )
  values (
    input_user_id,
    'activation_code',
    null,
    'activation_' || replace(v_redemption_id::text, '-', ''),
    public.normalize_plan_code(v_code.plan_code),
    'active',
    v_now,
    v_period_end,
    false
  )
  returning * into v_subscription;

  insert into public.activation_code_redemptions (
    id,
    activation_code_id,
    user_id,
    subscription_id,
    code_prefix,
    plan_code,
    billing_cycle,
    duration_months,
    redeemed_at
  )
  values (
    v_redemption_id,
    v_code.id,
    input_user_id,
    v_subscription.id,
    v_code.code_prefix,
    public.normalize_plan_code(v_code.plan_code),
    v_code.billing_cycle,
    v_code.duration_months,
    v_now
  );

  update public.activation_codes
  set redeemed_count = redeemed_count + 1,
      last_redeemed_at = v_now,
      status = case
        when redeemed_count + 1 >= max_redemptions then 'redeemed'
        else status
      end
  where id = v_code.id;

  insert into public.billing_events (
    user_id,
    subscription_id,
    provider,
    provider_event_id,
    event_type,
    payload,
    processed_at
  )
  values (
    input_user_id,
    v_subscription.id,
    'activation_code',
    'activation_code:' || replace(v_redemption_id::text, '-', ''),
    'activation_code.redeemed',
    jsonb_build_object(
      'activation_code_id', v_code.id,
      'code_prefix', v_code.code_prefix,
      'plan_code', public.normalize_plan_code(v_code.plan_code),
      'billing_cycle', v_code.billing_cycle,
      'duration_months', v_code.duration_months
    ),
    v_now
  );

  return query
  select
    v_subscription.id,
    public.normalize_plan_code(v_code.plan_code),
    v_code.billing_cycle,
    v_subscription.current_period_start,
    v_subscription.current_period_end,
    v_subscription.provider;
end;
$$;

revoke all on function public.redeem_activation_code(uuid, text) from public;
revoke all on function public.redeem_activation_code(uuid, text) from anon;
revoke all on function public.redeem_activation_code(uuid, text) from authenticated;
grant execute on function public.redeem_activation_code(uuid, text) to service_role;
