create index if not exists subscriptions_user_id_updated_at_idx
  on public.subscriptions (user_id, updated_at desc, id desc);

create index if not exists entry_targets_entry_id_sort_order_id_idx
  on public.entry_targets (entry_id, sort_order, id);

create index if not exists entry_rules_entry_id_sort_order_id_idx
  on public.entry_rules (entry_id, sort_order, id);

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
    latest_subscription.plan_code as subscription_plan_code,
    latest_subscription.status as subscription_status,
    latest_subscription.current_period_start as subscription_current_period_start,
    latest_subscription.current_period_end as subscription_current_period_end,
    latest_subscription.cancel_at_period_end as subscription_cancel_at_period_end,
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
    order by s.updated_at desc, s.id desc
    limit 1
  ) latest_subscription on true
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
