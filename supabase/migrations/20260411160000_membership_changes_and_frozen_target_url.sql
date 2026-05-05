alter table public.subscriptions
  add column if not exists billing_cycle text,
  add column if not exists duration_months integer,
  add column if not exists monthly_price numeric(10, 2);

update public.subscriptions
set billing_cycle = case
  when billing_cycle is not null and trim(billing_cycle) <> '' then billing_cycle
  when current_period_start is not null
    and current_period_end is not null
    and current_period_end - current_period_start >= interval '300 days' then 'yearly'
  else 'monthly'
end
where billing_cycle is null
   or trim(billing_cycle) = '';

update public.subscriptions
set duration_months = case
  when duration_months is not null and duration_months > 0 then duration_months
  when billing_cycle = 'yearly' then 12
  when current_period_start is not null and current_period_end is not null then greatest(
    1,
    ceil(extract(epoch from (current_period_end - current_period_start)) / extract(epoch from interval '30 days'))::integer
  )
  else 1
end
where duration_months is null
   or duration_months < 1;

update public.subscriptions
set monthly_price = case public.normalize_plan_code(plan_code)
  when 'starter' then case when billing_cycle = 'yearly' then round((59.0 / 12.0)::numeric, 2) else 6.00 end
  when 'premium' then case when billing_cycle = 'yearly' then round((159.0 / 12.0)::numeric, 2) else 16.00 end
  else 0.00
end
where monthly_price is null;

create table if not exists public.membership_change_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  action text not null,
  source text not null,
  provider text not null,
  reference_id text,
  previous_plan_code text,
  previous_period_end timestamptz,
  current_plan_code text not null,
  current_period_end timestamptz,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists membership_change_logs_user_id_created_at_idx
  on public.membership_change_logs (user_id, created_at desc, id desc);

alter table public.membership_change_logs enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'membership_change_logs'
      and policyname = 'membership_change_logs_owner_read'
  ) then
    create policy "membership_change_logs_owner_read"
    on public.membership_change_logs
    for select
    using (auth.uid() = user_id);
  end if;
end;
$$;

create or replace function public.get_effective_plan_code(p_user_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  current_subscription public.subscriptions%rowtype;
begin
  select *
  into current_subscription
  from public.subscriptions
  where user_id = p_user_id
    and lower(coalesce(trim(status), '')) in ('active', 'trialing', 'past_due')
    and coalesce(current_period_start, '-infinity'::timestamptz) <= timezone('utc', now())
    and coalesce(current_period_end, 'infinity'::timestamptz) >= timezone('utc', now())
  order by
    coalesce(current_period_start, created_at) desc nulls last,
    current_period_end desc nulls last,
    updated_at desc nulls last,
    created_at desc nulls last
  limit 1;

  if not found then
    return 'free';
  end if;

  return public.normalize_plan_code(current_subscription.plan_code);
end;
$$;

create or replace function public.resolve_public_entry_snapshot(
  p_slug text,
  p_usage_month date default date_trunc('month', timezone('utc', now()))::date
)
returns table (
  id uuid,
  user_id uuid,
  slug text,
  name text,
  status text,
  target_type text,
  rule_mode text,
  tracking_enabled boolean,
  ga4_measurement_id text,
  meta_pixel_id text,
  password_hash text,
  expires_at timestamptz,
  folder_id text,
  design jsonb,
  created_at timestamptz,
  updated_at timestamptz,
  entry_targets jsonb,
  entry_rules jsonb,
  subscription_plan_code text,
  subscription_status text,
  subscription_current_period_start timestamptz,
  subscription_current_period_end timestamptz,
  subscription_cancel_at_period_end boolean,
  monthly_visit_count integer
)
language sql
security definer
set search_path = public
as $$
  select
    e.id,
    e.user_id,
    e.slug,
    e.name,
    e.status,
    e.target_type,
    e.rule_mode,
    e.tracking_enabled,
    e.ga4_measurement_id,
    e.meta_pixel_id,
    e.password_hash,
    e.expires_at,
    e.folder_id,
    e.design,
    e.created_at,
    e.updated_at,
    coalesce(targets.items, '[]'::jsonb) as entry_targets,
    coalesce(rules.items, '[]'::jsonb) as entry_rules,
    current_subscription.plan_code as subscription_plan_code,
    current_subscription.status as subscription_status,
    current_subscription.current_period_start as subscription_current_period_start,
    current_subscription.current_period_end as subscription_current_period_end,
    current_subscription.cancel_at_period_end as subscription_cancel_at_period_end,
    coalesce(usage.visit_count, 0)::integer as monthly_visit_count
  from public.entries e
  left join lateral (
    select jsonb_agg(to_jsonb(t) order by t.sort_order, t.id) as items
    from public.entry_targets t
    where t.entry_id = e.id
  ) targets on true
  left join lateral (
    select jsonb_agg(to_jsonb(r) order by r.sort_order, r.id) as items
    from public.entry_rules r
    where r.entry_id = e.id
  ) rules on true
  left join lateral (
    select
      s.plan_code,
      s.status,
      s.current_period_start,
      s.current_period_end,
      s.cancel_at_period_end
    from public.subscriptions s
    where s.user_id = e.user_id
      and lower(coalesce(trim(s.status), '')) in ('active', 'trialing', 'past_due')
      and coalesce(s.current_period_start, '-infinity'::timestamptz) <= timezone('utc', now())
      and coalesce(s.current_period_end, 'infinity'::timestamptz) >= timezone('utc', now())
    order by
      coalesce(s.current_period_start, s.created_at) desc nulls last,
      s.current_period_end desc nulls last,
      s.updated_at desc nulls last,
      s.created_at desc nulls last
    limit 1
  ) current_subscription on true
  left join lateral (
    select u.visit_count
    from public.user_monthly_usage u
    where u.user_id = e.user_id
      and u.usage_month = p_usage_month
    limit 1
  ) usage on true
  where e.slug = p_slug
  limit 1;
$$;

create or replace function public.save_entry_bundle(
  p_existing_id uuid default null,
  p_slug text default null,
  p_name text default null,
  p_status text default 'draft',
  p_target_type text default 'web',
  p_rule_mode text default 'none',
  p_tracking_enabled boolean default false,
  p_ga4_measurement_id text default null,
  p_meta_pixel_id text default null,
  p_password_hash text default null,
  p_expires_at timestamptz default null,
  p_folder_id text default null,
  p_design jsonb default '{}'::jsonb,
  p_default_target jsonb default '{}'::jsonb,
  p_rule_targets jsonb default '[]'::jsonb,
  p_rules jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing_entry public.entries%rowtype;
  v_saved_entry public.entries%rowtype;
  v_existing_target_url text;
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception 'You need to sign in first.';
  end if;

  if nullif(trim(coalesce(p_name, '')), '') is null then
    raise exception 'Entry name is required.';
  end if;

  if jsonb_typeof(coalesce(p_default_target, '{}'::jsonb)) <> 'object' then
    raise exception 'A default target is required.';
  end if;

  if p_existing_id is null then
    insert into public.entries (
      user_id,
      slug,
      name,
      status,
      target_type,
      rule_mode,
      tracking_enabled,
      ga4_measurement_id,
      meta_pixel_id,
      password_hash,
      expires_at,
      folder_id,
      design
    )
    values (
      v_user_id,
      nullif(trim(coalesce(p_slug, '')), ''),
      p_name,
      p_status,
      p_target_type,
      p_rule_mode,
      coalesce(p_tracking_enabled, false),
      nullif(trim(coalesce(p_ga4_measurement_id, '')), ''),
      nullif(trim(coalesce(p_meta_pixel_id, '')), ''),
      nullif(trim(coalesce(p_password_hash, '')), ''),
      p_expires_at,
      nullif(trim(coalesce(p_folder_id, '')), ''),
      coalesce(p_design, '{}'::jsonb)
    )
    returning *
    into v_saved_entry;
  else
    select *
    into v_existing_entry
    from public.entries
    where id = p_existing_id
      and user_id = v_user_id
    for update;

    if not found then
      raise exception 'Unable to save this entry.';
    end if;

    select nullif(trim(coalesce(target.url, '')), '')
    into v_existing_target_url
    from public.entry_targets as target
    where target.entry_id = v_existing_entry.id
      and nullif(trim(coalesce(target.url, '')), '') is not null
    order by target.sort_order asc, target.id asc
    limit 1;

    update public.entries
    set
      slug = v_existing_entry.slug,
      name = p_name,
      status = p_status,
      target_type = p_target_type,
      rule_mode = p_rule_mode,
      tracking_enabled = coalesce(p_tracking_enabled, false),
      ga4_measurement_id = nullif(trim(coalesce(p_ga4_measurement_id, '')), ''),
      meta_pixel_id = nullif(trim(coalesce(p_meta_pixel_id, '')), ''),
      password_hash = nullif(trim(coalesce(p_password_hash, '')), ''),
      expires_at = p_expires_at,
      folder_id = nullif(trim(coalesce(p_folder_id, '')), ''),
      design = coalesce(p_design, '{}'::jsonb)
    where id = v_existing_entry.id
    returning *
    into v_saved_entry;

    delete from public.entry_rules
    where entry_id = v_saved_entry.id;

    delete from public.entry_targets
    where entry_id = v_saved_entry.id;
  end if;

  insert into public.entry_targets (
    entry_id,
    kind,
    label,
    is_default,
    delivery,
    url,
    whatsapp,
    vcard,
    sort_order
  )
  values (
    v_saved_entry.id,
    coalesce(nullif(trim(p_default_target->>'kind'), ''), p_target_type),
    nullif(trim(coalesce(p_default_target->>'label', '')), ''),
    true,
    case
      when coalesce(nullif(trim(p_default_target->>'kind'), ''), p_target_type) = 'vcard' then 'preview'
      else coalesce(nullif(trim(p_default_target->>'delivery'), ''), 'redirect')
    end,
    coalesce(
      nullif(trim(coalesce(v_existing_target_url, '')), ''),
      nullif(trim(coalesce(p_default_target->>'url', '')), '')
    ),
    case
      when jsonb_typeof(p_default_target->'whatsapp') = 'object' then p_default_target->'whatsapp'
      else null
    end,
    case
      when jsonb_typeof(p_default_target->'vcard') = 'object' then p_default_target->'vcard'
      else null
    end,
    0
  );

  with rule_target_source as (
    select
      item.value as payload,
      item.ordinality::integer as ordinality
    from jsonb_array_elements(coalesce(p_rule_targets, '[]'::jsonb)) with ordinality as item(value, ordinality)
  ),
  inserted_rule_targets as (
    insert into public.entry_targets (
      entry_id,
      kind,
      label,
      is_default,
      delivery,
      url,
      whatsapp,
      vcard,
      sort_order
    )
    select
      v_saved_entry.id,
      coalesce(nullif(trim(payload->>'kind'), ''), 'web'),
      nullif(trim(coalesce(payload->>'label', '')), ''),
      false,
      coalesce(nullif(trim(payload->>'delivery'), ''), 'redirect'),
      nullif(trim(coalesce(payload->>'url', '')), ''),
      case
        when jsonb_typeof(payload->'whatsapp') = 'object' then payload->'whatsapp'
        else null
      end,
      case
        when jsonb_typeof(payload->'vcard') = 'object' then payload->'vcard'
        else null
      end,
      coalesce((payload->>'sortOrder')::integer, ordinality)
    from rule_target_source
    order by ordinality
    returning id, sort_order
  ),
  indexed_rule_targets as (
    select
      id,
      row_number() over (order by sort_order, id)::integer as ordinality
    from inserted_rule_targets
  ),
  rule_source as (
    select
      item.value as payload,
      item.ordinality::integer as ordinality
    from jsonb_array_elements(coalesce(p_rules, '[]'::jsonb)) with ordinality as item(value, ordinality)
  )
  insert into public.entry_rules (
    entry_id,
    target_id,
    mode,
    language,
    region,
    device_os,
    param_key,
    param_value,
    ab_variant,
    weight,
    sort_order
  )
  select
    v_saved_entry.id,
    indexed_rule_targets.id,
    payload->>'mode',
    nullif(trim(coalesce(payload->>'language', '')), ''),
    nullif(trim(coalesce(payload->>'region', '')), ''),
    nullif(trim(coalesce(payload->>'device_os', '')), ''),
    nullif(trim(coalesce(payload->>'param_key', '')), ''),
    nullif(trim(coalesce(payload->>'param_value', '')), ''),
    nullif(trim(coalesce(payload->>'ab_variant', '')), ''),
    case
      when nullif(trim(coalesce(payload->>'weight', '')), '') is null then null
      else (payload->>'weight')::integer
    end,
    coalesce((payload->>'sortOrder')::integer, ordinality - 1)
  from rule_source
  left join indexed_rule_targets
    on indexed_rule_targets.ordinality = rule_source.ordinality
  order by rule_source.ordinality;

  select jsonb_build_object(
    'entry',
    to_jsonb(v_saved_entry),
    'targets',
    coalesce((
      select jsonb_agg(to_jsonb(target_row) order by target_row.sort_order, target_row.id)
      from public.entry_targets as target_row
      where target_row.entry_id = v_saved_entry.id
    ), '[]'::jsonb),
    'rules',
    coalesce((
      select jsonb_agg(to_jsonb(rule_row) order by rule_row.sort_order, rule_row.id)
      from public.entry_rules as rule_row
      where rule_row.entry_id = v_saved_entry.id
    ), '[]'::jsonb)
  )
  into v_result;

  return v_result;
end;
$$;
