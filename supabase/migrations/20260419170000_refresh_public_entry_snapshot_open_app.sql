create or replace function public.resolve_public_entry_snapshot(
  p_path_prefix text default 'l',
  p_slug text default null,
  p_usage_month date default date_trunc('month', timezone('utc', now()))::date
)
returns table (
  id uuid,
  user_id uuid,
  path_prefix text,
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
  with normalized_entry as (
    select
      coalesce(nullif(lower(trim(coalesce(p_path_prefix, ''))), ''), 'l') as path_prefix,
      nullif(trim(coalesce(p_slug, '')), '') as slug
  ),
  entry_owner as (
    select e.user_id
    from public.entries e
    join normalized_entry ne
      on ne.path_prefix = e.path_prefix
     and ne.slug = e.slug
    limit 1
  ),
  latest_subscription as (
    select
      s.plan_code,
      s.status,
      s.current_period_start,
      s.current_period_end,
      s.cancel_at_period_end
    from public.subscriptions s
    join entry_owner eo on eo.user_id = s.user_id
    order by s.updated_at desc
    limit 1
  ),
  usage as (
    select u.visit_count
    from public.user_monthly_usage u
    join entry_owner eo on eo.user_id = u.user_id
    where u.usage_month = p_usage_month
    limit 1
  )
  select
    e.id,
    e.user_id,
    e.path_prefix,
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
    latest_subscription.plan_code as subscription_plan_code,
    latest_subscription.status as subscription_status,
    latest_subscription.current_period_start as subscription_current_period_start,
    latest_subscription.current_period_end as subscription_current_period_end,
    latest_subscription.cancel_at_period_end as subscription_cancel_at_period_end,
    coalesce(usage.visit_count, 0)::integer as monthly_visit_count
  from public.entries e
  join normalized_entry ne
    on ne.path_prefix = e.path_prefix
   and ne.slug = e.slug
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
  left join latest_subscription on true
  left join usage on true
  limit 1;
$$;