alter table public.profiles
add column if not exists email_snapshot text;

comment on column public.profiles.email_snapshot is
  'Best-effort copy of auth.users.email for admin search and back office views. auth.users remains the source of truth.';

update public.profiles as profiles
set email_snapshot = lower(trim(users.email))
from auth.users as users
where users.id = profiles.user_id
  and profiles.email_snapshot is distinct from lower(trim(users.email));

create index if not exists profiles_email_snapshot_idx
  on public.profiles (lower(email_snapshot))
  where email_snapshot is not null;
