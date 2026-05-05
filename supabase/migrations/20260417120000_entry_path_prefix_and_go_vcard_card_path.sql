alter table public.entries
add column if not exists path_prefix text;

update public.entries
set path_prefix = 'l'
where path_prefix is null;

alter table public.entries
alter column path_prefix set default 'l';

alter table public.entries
alter column path_prefix set not null;

alter table public.entries
drop constraint if exists entries_path_prefix_format_check;

alter table public.entries
add constraint entries_path_prefix_format_check
check (path_prefix ~ '^[a-z][a-z0-9]{0,7}$');

alter table public.entries
drop constraint if exists entries_slug_key;

drop index if exists public.entries_path_prefix_slug_idx;

create unique index if not exists entries_path_prefix_slug_idx
  on public.entries (path_prefix, slug);

create index if not exists entries_target_type_slug_idx
  on public.entries (target_type, slug);

create index if not exists entry_targets_default_vcard_content_id_idx
  on public.entry_targets (((vcard ->> 'contentId')))
  where kind = 'vcard' and is_default = true;

create or replace function public.save_entry_bundle(
  p_existing_id uuid default null,
  p_path_prefix text default 'l',
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
  v_locked_target_type text := coalesce(nullif(trim(coalesce(p_target_type, '')), ''), 'web');
  v_locked_path_prefix text := coalesce(nullif(lower(trim(coalesce(p_path_prefix, ''))), ''), 'l');
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

  if v_locked_path_prefix !~ '^[a-z][a-z0-9]{0,7}$' then
    raise exception 'Entry path prefix is invalid.';
  end if;

  if p_existing_id is null then
    insert into public.entries (
      user_id,
      path_prefix,
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
      v_locked_path_prefix,
      nullif(trim(coalesce(p_slug, '')), ''),
      p_name,
      p_status,
      v_locked_target_type,
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

    v_locked_target_type := coalesce(nullif(trim(coalesce(v_existing_entry.target_type, '')), ''), 'web');
    v_locked_path_prefix := coalesce(nullif(lower(trim(coalesce(v_existing_entry.path_prefix, ''))), ''), 'l');

    if nullif(trim(coalesce(p_target_type, '')), '') is distinct from v_locked_target_type then
      raise exception 'Saved entries cannot change target type.';
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
      path_prefix = v_locked_path_prefix,
      slug = v_existing_entry.slug,
      name = p_name,
      status = p_status,
      target_type = v_locked_target_type,
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
    v_locked_target_type,
    nullif(trim(coalesce(p_default_target->>'label', '')), ''),
    true,
    case
      when v_locked_target_type = 'vcard' then 'preview'
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
    coalesce((payload->>'sortOrder')::integer, rule_source.ordinality - 1)
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
