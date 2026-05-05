alter table public.entry_visits
  add column if not exists user_id uuid references auth.users (id) on delete cascade,
  add column if not exists visitor_fingerprint text;

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

update public.entry_visits as visits
set user_id = entries.user_id
from public.entries as entries
where entries.id = visits.entry_id
  and visits.user_id is null;

update public.entry_visits as visits
set visitor_fingerprint = public.compute_entry_visit_fingerprint(
  visits.user_agent,
  visits.referrer,
  visits.country_code,
  visits.language,
  visits.locale
)
where visits.visitor_fingerprint is null;

alter table public.entry_visits
  alter column user_id set not null,
  alter column visitor_fingerprint set not null;

create index if not exists entry_visits_user_id_entry_id_created_at_idx
  on public.entry_visits (user_id, entry_id, created_at desc);

drop policy if exists "entry_visits_owner_read" on public.entry_visits;
create policy "entry_visits_owner_read"
on public.entry_visits
for select
using (auth.uid() = user_id);

create table if not exists public.entry_unique_visitors (
  entry_id uuid not null references public.entries (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  visitor_fingerprint text not null,
  first_seen_at timestamptz not null,
  last_seen_at timestamptz not null,
  visit_count integer not null default 1 check (visit_count >= 1),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (entry_id, visitor_fingerprint)
);

create index if not exists entry_unique_visitors_user_id_entry_id_last_seen_at_idx
  on public.entry_unique_visitors (user_id, entry_id, last_seen_at desc);

drop trigger if exists entry_unique_visitors_set_updated_at on public.entry_unique_visitors;
create trigger entry_unique_visitors_set_updated_at
before update on public.entry_unique_visitors
for each row execute procedure public.set_updated_at();

alter table public.entry_unique_visitors enable row level security;

drop policy if exists "entry_unique_visitors_owner_read" on public.entry_unique_visitors;
create policy "entry_unique_visitors_owner_read"
on public.entry_unique_visitors
for select
using (auth.uid() = user_id);

insert into public.entry_unique_visitors (
  entry_id,
  user_id,
  visitor_fingerprint,
  first_seen_at,
  last_seen_at,
  visit_count
)
select
  visits.entry_id,
  visits.user_id,
  visits.visitor_fingerprint,
  min(visits.created_at) as first_seen_at,
  max(visits.created_at) as last_seen_at,
  count(*)::integer as visit_count
from public.entry_visits as visits
group by visits.entry_id, visits.user_id, visits.visitor_fingerprint
on conflict (entry_id, visitor_fingerprint) do update
set
  user_id = excluded.user_id,
  first_seen_at = least(public.entry_unique_visitors.first_seen_at, excluded.first_seen_at),
  last_seen_at = greatest(public.entry_unique_visitors.last_seen_at, excluded.last_seen_at),
  visit_count = greatest(public.entry_unique_visitors.visit_count, excluded.visit_count),
  updated_at = timezone('utc', now());

create or replace function public.process_entry_visit_hot_path()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_created_at timestamptz := coalesce(new.created_at, timezone('utc', now()));
  v_visit_date date := timezone('utc', v_created_at)::date;
  v_month_bucket date := date_trunc('month', v_created_at)::date;
begin
  insert into public.user_monthly_usage (user_id, usage_month, visit_count)
  values (new.user_id, v_month_bucket, 1)
  on conflict (user_id, usage_month)
  do update
    set visit_count = public.user_monthly_usage.visit_count + 1,
        updated_at = timezone('utc', now());

  insert into public.entry_visit_daily_totals (entry_id, visit_date, visit_count, last_visit_at)
  values (new.entry_id, v_visit_date, 1, v_created_at)
  on conflict (entry_id, visit_date) do update
  set
    visit_count = public.entry_visit_daily_totals.visit_count + 1,
    last_visit_at = greatest(
      coalesce(public.entry_visit_daily_totals.last_visit_at, excluded.last_visit_at),
      excluded.last_visit_at
    ),
    updated_at = timezone('utc', now());

  insert into public.entry_visit_daily_dimensions (entry_id, visit_date, dimension, dimension_value, visit_count)
  values
    (
      new.entry_id,
      v_visit_date,
      'region',
      public.entry_visit_dimension_value('region', new.locale, new.country_code, new.region_code, new.device_type, new.device_os, new.language, new.referrer),
      1
    ),
    (
      new.entry_id,
      v_visit_date,
      'device',
      public.entry_visit_dimension_value('device', new.locale, new.country_code, new.region_code, new.device_type, new.device_os, new.language, new.referrer),
      1
    ),
    (
      new.entry_id,
      v_visit_date,
      'os',
      public.entry_visit_dimension_value('os', new.locale, new.country_code, new.region_code, new.device_type, new.device_os, new.language, new.referrer),
      1
    ),
    (
      new.entry_id,
      v_visit_date,
      'language',
      public.entry_visit_dimension_value('language', new.locale, new.country_code, new.region_code, new.device_type, new.device_os, new.language, new.referrer),
      1
    ),
    (
      new.entry_id,
      v_visit_date,
      'source',
      public.entry_visit_dimension_value('source', new.locale, new.country_code, new.region_code, new.device_type, new.device_os, new.language, new.referrer),
      1
    )
  on conflict (entry_id, visit_date, dimension, dimension_value) do update
  set
    visit_count = public.entry_visit_daily_dimensions.visit_count + 1,
    updated_at = timezone('utc', now());

  insert into public.entry_unique_visitors (
    entry_id,
    user_id,
    visitor_fingerprint,
    first_seen_at,
    last_seen_at,
    visit_count
  )
  values (
    new.entry_id,
    new.user_id,
    new.visitor_fingerprint,
    v_created_at,
    v_created_at,
    1
  )
  on conflict (entry_id, visitor_fingerprint) do update
  set
    user_id = excluded.user_id,
    last_seen_at = greatest(public.entry_unique_visitors.last_seen_at, excluded.last_seen_at),
    visit_count = public.entry_unique_visitors.visit_count + 1,
    updated_at = timezone('utc', now());

  return new;
end;
$$;

drop trigger if exists entry_visits_increment_user_monthly_usage on public.entry_visits;
drop trigger if exists entry_visits_increment_daily_aggregates on public.entry_visits;
drop trigger if exists entry_visits_process_hot_path on public.entry_visits;

create trigger entry_visits_process_hot_path
after insert on public.entry_visits
for each row execute procedure public.process_entry_visit_hot_path();

create or replace function public.get_entry_unique_visitor_counts(
  p_entry_ids uuid[],
  p_since timestamptz default null
)
returns table (
  entry_id uuid,
  unique_visitors bigint
)
language sql
security definer
set search_path = public
as $$
  select
    visitors.entry_id,
    count(*)::bigint as unique_visitors
  from public.entry_unique_visitors as visitors
  where auth.uid() is not null
    and visitors.user_id = auth.uid()
    and visitors.entry_id = any(coalesce(p_entry_ids, array[]::uuid[]))
    and (p_since is null or visitors.last_seen_at >= p_since)
  group by visitors.entry_id;
$$;

grant execute on function public.get_entry_unique_visitor_counts(uuid[], timestamptz) to authenticated;
