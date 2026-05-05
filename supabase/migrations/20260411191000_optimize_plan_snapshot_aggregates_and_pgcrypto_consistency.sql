create or replace function public.get_user_storage_bytes(p_user_id uuid)
returns bigint
language sql
security definer
set search_path = public
as $$
  select coalesce(sum(size_bytes), 0)::bigint
  from public.assets
  where user_id = p_user_id;
$$;

grant execute on function public.get_user_storage_bytes(uuid) to authenticated;

create or replace function public.compute_entry_visit_fingerprint(
  p_user_agent text,
  p_referrer text,
  p_country_code text,
  p_language text,
  p_locale text
)
returns text
language sql
immutable
as $$
  select encode(
    extensions.digest(
      concat_ws(
        '::',
        'v1',
        coalesce(nullif(lower(trim(p_user_agent)), ''), 'ua'),
        coalesce(nullif(lower(trim(p_referrer)), ''), 'ref'),
        coalesce(nullif(lower(trim(p_country_code)), ''), 'country'),
        coalesce(
          nullif(lower(trim(p_language)), ''),
          nullif(lower(trim(p_locale)), ''),
          'lang'
        )
      ),
      'sha256'
    ),
    'hex'
  );
$$;
