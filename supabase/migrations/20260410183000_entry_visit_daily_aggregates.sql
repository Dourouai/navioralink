create table if not exists public.entry_visit_daily_totals (
  entry_id uuid not null references public.entries (id) on delete cascade,
  visit_date date not null,
  visit_count integer not null default 0 check (visit_count >= 0),
  last_visit_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (entry_id, visit_date)
);

create table if not exists public.entry_visit_daily_dimensions (
  entry_id uuid not null references public.entries (id) on delete cascade,
  visit_date date not null,
  dimension text not null check (dimension in ('region', 'device', 'os', 'language', 'source')),
  dimension_value text not null,
  visit_count integer not null default 0 check (visit_count >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (entry_id, visit_date, dimension, dimension_value)
);

create index if not exists entry_visit_daily_totals_visit_date_idx
  on public.entry_visit_daily_totals (visit_date desc);

create index if not exists entry_visit_daily_dimensions_entry_dimension_visit_date_idx
  on public.entry_visit_daily_dimensions (entry_id, dimension, visit_date desc);

create index if not exists entry_visit_daily_dimensions_dimension_value_idx
  on public.entry_visit_daily_dimensions (dimension, dimension_value);

drop trigger if exists entry_visit_daily_totals_set_updated_at on public.entry_visit_daily_totals;
create trigger entry_visit_daily_totals_set_updated_at
before update on public.entry_visit_daily_totals
for each row execute procedure public.set_updated_at();

drop trigger if exists entry_visit_daily_dimensions_set_updated_at on public.entry_visit_daily_dimensions;
create trigger entry_visit_daily_dimensions_set_updated_at
before update on public.entry_visit_daily_dimensions
for each row execute procedure public.set_updated_at();

alter table public.entry_visit_daily_totals enable row level security;
alter table public.entry_visit_daily_dimensions enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'entry_visit_daily_totals'
      and policyname = 'entry_visit_daily_totals_owner_read'
  ) then
    create policy "entry_visit_daily_totals_owner_read"
    on public.entry_visit_daily_totals
    for select
    using (
      exists (
        select 1
        from public.entries
        where entries.id = entry_visit_daily_totals.entry_id
          and entries.user_id = auth.uid()
      )
    );
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'entry_visit_daily_dimensions'
      and policyname = 'entry_visit_daily_dimensions_owner_read'
  ) then
    create policy "entry_visit_daily_dimensions_owner_read"
    on public.entry_visit_daily_dimensions
    for select
    using (
      exists (
        select 1
        from public.entries
        where entries.id = entry_visit_daily_dimensions.entry_id
          and entries.user_id = auth.uid()
      )
    );
  end if;
end;
$$;

create or replace function public.entry_visit_dimension_value(
  p_dimension text,
  p_locale text,
  p_country_code text,
  p_region_code text,
  p_device_type text,
  p_device_os text,
  p_language text,
  p_referrer text
)
returns text
language sql
immutable
as $$
  select case
    when p_dimension = 'region' then coalesce(nullif(upper(trim(p_country_code)), ''), nullif(trim(p_region_code), ''), 'Unknown')
    when p_dimension = 'device' then coalesce(nullif(trim(p_device_type), ''), 'Unknown')
    when p_dimension = 'os' then coalesce(nullif(trim(p_device_os), ''), 'Unknown')
    when p_dimension = 'language' then coalesce(nullif(trim(p_language), ''), nullif(trim(p_locale), ''), 'Unknown')
    when p_dimension = 'source' then coalesce(nullif(trim(p_referrer), ''), 'Direct')
    else 'Unknown'
  end;
$$;

create or replace function public.increment_entry_visit_daily_aggregates()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_visit_date date := timezone('utc', coalesce(new.created_at, timezone('utc', now())))::date;
begin
  insert into public.entry_visit_daily_totals (entry_id, visit_date, visit_count, last_visit_at)
  values (new.entry_id, v_visit_date, 1, coalesce(new.created_at, timezone('utc', now())))
  on conflict (entry_id, visit_date) do update
  set
    visit_count = public.entry_visit_daily_totals.visit_count + 1,
    last_visit_at = greatest(coalesce(public.entry_visit_daily_totals.last_visit_at, excluded.last_visit_at), excluded.last_visit_at),
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

  return new;
end;
$$;

drop trigger if exists entry_visits_increment_daily_aggregates on public.entry_visits;
create trigger entry_visits_increment_daily_aggregates
after insert on public.entry_visits
for each row execute procedure public.increment_entry_visit_daily_aggregates();

insert into public.entry_visit_daily_totals (entry_id, visit_date, visit_count, last_visit_at)
select
  visits.entry_id,
  timezone('utc', visits.created_at)::date as visit_date,
  count(*)::integer as visit_count,
  max(visits.created_at) as last_visit_at
from public.entry_visits as visits
group by visits.entry_id, timezone('utc', visits.created_at)::date
on conflict (entry_id, visit_date) do update
set
  visit_count = excluded.visit_count,
  last_visit_at = greatest(coalesce(public.entry_visit_daily_totals.last_visit_at, excluded.last_visit_at), excluded.last_visit_at),
  updated_at = timezone('utc', now());

insert into public.entry_visit_daily_dimensions (entry_id, visit_date, dimension, dimension_value, visit_count)
select
  aggregates.entry_id,
  aggregates.visit_date,
  aggregates.dimension,
  aggregates.dimension_value,
  count(*)::integer as visit_count
from (
  select
    visits.entry_id,
    timezone('utc', visits.created_at)::date as visit_date,
    'region'::text as dimension,
    public.entry_visit_dimension_value('region', visits.locale, visits.country_code, visits.region_code, visits.device_type, visits.device_os, visits.language, visits.referrer) as dimension_value
  from public.entry_visits as visits
  union all
  select
    visits.entry_id,
    timezone('utc', visits.created_at)::date as visit_date,
    'device'::text as dimension,
    public.entry_visit_dimension_value('device', visits.locale, visits.country_code, visits.region_code, visits.device_type, visits.device_os, visits.language, visits.referrer)
  from public.entry_visits as visits
  union all
  select
    visits.entry_id,
    timezone('utc', visits.created_at)::date as visit_date,
    'os'::text as dimension,
    public.entry_visit_dimension_value('os', visits.locale, visits.country_code, visits.region_code, visits.device_type, visits.device_os, visits.language, visits.referrer)
  from public.entry_visits as visits
  union all
  select
    visits.entry_id,
    timezone('utc', visits.created_at)::date as visit_date,
    'language'::text as dimension,
    public.entry_visit_dimension_value('language', visits.locale, visits.country_code, visits.region_code, visits.device_type, visits.device_os, visits.language, visits.referrer)
  from public.entry_visits as visits
  union all
  select
    visits.entry_id,
    timezone('utc', visits.created_at)::date as visit_date,
    'source'::text as dimension,
    public.entry_visit_dimension_value('source', visits.locale, visits.country_code, visits.region_code, visits.device_type, visits.device_os, visits.language, visits.referrer)
  from public.entry_visits as visits
) as aggregates
group by aggregates.entry_id, aggregates.visit_date, aggregates.dimension, aggregates.dimension_value
on conflict (entry_id, visit_date, dimension, dimension_value) do update
set
  visit_count = excluded.visit_count,
  updated_at = timezone('utc', now());

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
    visits.entry_id,
    count(
      distinct concat_ws(
        '::',
        coalesce(nullif(trim(visits.user_agent), ''), 'ua'),
        coalesce(nullif(trim(visits.referrer), ''), 'ref'),
        coalesce(nullif(trim(visits.country_code), ''), 'country'),
        coalesce(nullif(trim(visits.language), ''), nullif(trim(visits.locale), ''), 'lang')
      )
    )::bigint as unique_visitors
  from public.entry_visits as visits
  join public.entries as entries
    on entries.id = visits.entry_id
  where auth.uid() is not null
    and entries.user_id = auth.uid()
    and visits.entry_id = any(coalesce(p_entry_ids, array[]::uuid[]))
    and (p_since is null or visits.created_at >= p_since)
  group by visits.entry_id;
$$;

grant execute on function public.get_entry_unique_visitor_counts(uuid[], timestamptz) to authenticated;
