create table if not exists public.user_monthly_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  usage_month date not null,
  visit_count integer not null default 0 check (visit_count >= 0),
  ai_conversation_count integer not null default 0 check (ai_conversation_count >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, usage_month)
);

create index if not exists user_monthly_usage_usage_month_idx
  on public.user_monthly_usage (usage_month desc);

drop trigger if exists user_monthly_usage_set_updated_at on public.user_monthly_usage;
create trigger user_monthly_usage_set_updated_at
before update on public.user_monthly_usage
for each row execute procedure public.set_updated_at();

alter table public.user_monthly_usage enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'user_monthly_usage'
      and policyname = 'user_monthly_usage_owner_read'
  ) then
    create policy "user_monthly_usage_owner_read"
    on public.user_monthly_usage
    for select
    using (auth.uid() = user_id);
  end if;
end $$;

create or replace function public.increment_user_monthly_visit_usage()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  visit_user_id uuid;
  month_bucket date;
begin
  select user_id
  into visit_user_id
  from public.entries
  where id = new.entry_id
  limit 1;

  if visit_user_id is null then
    return new;
  end if;

  month_bucket := date_trunc('month', coalesce(new.created_at, timezone('utc', now())))::date;

  insert into public.user_monthly_usage (user_id, usage_month, visit_count)
  values (visit_user_id, month_bucket, 1)
  on conflict (user_id, usage_month)
  do update
    set visit_count = public.user_monthly_usage.visit_count + 1,
        updated_at = timezone('utc', now());

  return new;
end;
$$;

create or replace function public.increment_user_monthly_ai_usage()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  month_bucket date;
begin
  month_bucket := date_trunc('month', coalesce(new.created_at, timezone('utc', now())))::date;

  insert into public.user_monthly_usage (user_id, usage_month, ai_conversation_count)
  values (new.user_id, month_bucket, 1)
  on conflict (user_id, usage_month)
  do update
    set ai_conversation_count = public.user_monthly_usage.ai_conversation_count + 1,
        updated_at = timezone('utc', now());

  return new;
end;
$$;

drop trigger if exists entry_visits_increment_user_monthly_usage on public.entry_visits;
create trigger entry_visits_increment_user_monthly_usage
after insert on public.entry_visits
for each row execute procedure public.increment_user_monthly_visit_usage();

drop trigger if exists ai_conversation_events_increment_user_monthly_usage on public.ai_conversation_events;
create trigger ai_conversation_events_increment_user_monthly_usage
after insert on public.ai_conversation_events
for each row execute procedure public.increment_user_monthly_ai_usage();

insert into public.user_monthly_usage (user_id, usage_month, visit_count)
select
  entries.user_id,
  date_trunc('month', entry_visits.created_at)::date as usage_month,
  count(*)::integer as visit_count
from public.entry_visits
join public.entries on entries.id = entry_visits.entry_id
group by entries.user_id, date_trunc('month', entry_visits.created_at)::date
on conflict (user_id, usage_month)
do update
  set visit_count = greatest(public.user_monthly_usage.visit_count, excluded.visit_count),
      updated_at = timezone('utc', now());

insert into public.user_monthly_usage (user_id, usage_month, ai_conversation_count)
select
  ai_conversation_events.user_id,
  date_trunc('month', ai_conversation_events.created_at)::date as usage_month,
  count(*)::integer as ai_conversation_count
from public.ai_conversation_events
group by ai_conversation_events.user_id, date_trunc('month', ai_conversation_events.created_at)::date
on conflict (user_id, usage_month)
do update
  set ai_conversation_count = greatest(public.user_monthly_usage.ai_conversation_count, excluded.ai_conversation_count),
      updated_at = timezone('utc', now());
