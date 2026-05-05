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
  v_locked_target_type text := coalesce(nullif(trim(coalesce(p_target_type, '')), ''), 'web');
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
