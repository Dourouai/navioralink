create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  timezone text,
  default_locale text not null default 'en',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null default 'cos',
  bucket text not null,
  object_path text not null,
  original_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  visibility text not null default 'private' check (visibility in ('private', 'public')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  slug text not null unique,
  name text not null,
  status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'expired', 'archived')),
  target_type text not null default 'web' check (target_type in ('web', 'whatsapp', 'vcard')),
  rule_mode text not null default 'none' check (rule_mode in ('none', 'language', 'region', 'device', 'param', 'ab')),
  tracking_enabled boolean not null default false,
  ga4_measurement_id text,
  meta_pixel_id text,
  password_hash text,
  expires_at timestamptz,
  folder_id text,
  design jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.entry_targets (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.entries (id) on delete cascade,
  kind text not null check (kind in ('web', 'whatsapp', 'vcard')),
  label text,
  is_default boolean not null default false,
  delivery text not null default 'redirect' check (delivery in ('redirect', 'preview', 'download')),
  url text,
  whatsapp jsonb,
  vcard jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists entry_targets_one_default_per_entry_idx
  on public.entry_targets (entry_id)
  where is_default = true;

create table if not exists public.entry_rules (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.entries (id) on delete cascade,
  target_id uuid references public.entry_targets (id) on delete cascade,
  mode text not null check (mode in ('language', 'region', 'device', 'param', 'ab')),
  language text,
  region text,
  device_os text,
  param_key text,
  param_value text,
  ab_variant text check (ab_variant in ('A', 'B')),
  weight integer check (weight between 0 and 100),
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.entry_visits (
  id bigint generated always as identity primary key,
  entry_id uuid not null references public.entries (id) on delete cascade,
  target_id uuid references public.entry_targets (id) on delete set null,
  locale text,
  country_code text,
  region_code text,
  device_type text,
  device_os text,
  language text,
  referrer text,
  user_agent text,
  resolved_url text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null default 'creem',
  provider_customer_id text,
  provider_subscription_id text unique,
  plan_code text not null,
  status text not null,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.billing_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  subscription_id uuid references public.subscriptions (id) on delete set null,
  provider text not null default 'creem',
  provider_event_id text,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists entries_user_id_idx on public.entries (user_id);
create index if not exists entries_status_idx on public.entries (status);
create index if not exists entry_targets_entry_id_idx on public.entry_targets (entry_id);
create index if not exists entry_rules_entry_id_idx on public.entry_rules (entry_id);
create index if not exists entry_visits_entry_id_created_at_idx on public.entry_visits (entry_id, created_at desc);
create index if not exists subscriptions_user_id_idx on public.subscriptions (user_id);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

drop trigger if exists assets_set_updated_at on public.assets;
create trigger assets_set_updated_at
before update on public.assets
for each row execute procedure public.set_updated_at();

drop trigger if exists entries_set_updated_at on public.entries;
create trigger entries_set_updated_at
before update on public.entries
for each row execute procedure public.set_updated_at();

drop trigger if exists entry_targets_set_updated_at on public.entry_targets;
create trigger entry_targets_set_updated_at
before update on public.entry_targets
for each row execute procedure public.set_updated_at();

drop trigger if exists entry_rules_set_updated_at on public.entry_rules;
create trigger entry_rules_set_updated_at
before update on public.entry_rules
for each row execute procedure public.set_updated_at();

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at
before update on public.subscriptions
for each row execute procedure public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.assets enable row level security;
alter table public.entries enable row level security;
alter table public.entry_targets enable row level security;
alter table public.entry_rules enable row level security;
alter table public.entry_visits enable row level security;
alter table public.subscriptions enable row level security;
alter table public.billing_events enable row level security;

create policy "profiles_owner_all"
on public.profiles
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "assets_owner_all"
on public.assets
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "entries_owner_all"
on public.entries
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "entry_targets_owner_all"
on public.entry_targets
for all
using (
  exists (
    select 1
    from public.entries
    where entries.id = entry_targets.entry_id
      and entries.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.entries
    where entries.id = entry_targets.entry_id
      and entries.user_id = auth.uid()
  )
);

create policy "entry_rules_owner_all"
on public.entry_rules
for all
using (
  exists (
    select 1
    from public.entries
    where entries.id = entry_rules.entry_id
      and entries.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.entries
    where entries.id = entry_rules.entry_id
      and entries.user_id = auth.uid()
  )
);

create policy "entry_visits_owner_read"
on public.entry_visits
for select
using (
  exists (
    select 1
    from public.entries
    where entries.id = entry_visits.entry_id
      and entries.user_id = auth.uid()
  )
);

create policy "subscriptions_owner_all"
on public.subscriptions
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "billing_events_owner_read"
on public.billing_events
for select
using (auth.uid() = user_id);
