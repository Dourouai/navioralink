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
    v_generated := upper(encode(extensions.gen_random_bytes(6), 'hex'));
    v_generated := format('NAV-%s-%s-%s', substr(v_generated, 1, 4), substr(v_generated, 5, 4), substr(v_generated, 9, 4));
    exit when not exists (
      select 1
      from public.activation_codes
      where code_hash = public.hash_activation_code(v_generated)
    );
  end loop;

  v_code_prefix := concat_ws('-', split_part(v_generated, '-', 2), split_part(v_generated, '-', 3), split_part(v_generated, '-', 4));

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
