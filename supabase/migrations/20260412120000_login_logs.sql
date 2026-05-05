create table if not exists public.login_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  email text not null,
  ip_address text,
  user_agent text,
  type text not null check (type in ('login', 'register')),
  status text not null check (status in ('success', 'failed', 'captcha_failed', 'rate_limited')),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists login_logs_user_id_created_at_idx
  on public.login_logs (user_id, created_at desc);

create index if not exists login_logs_created_at_idx
  on public.login_logs (created_at desc);

alter table public.login_logs enable row level security;

-- Users can only read their own login logs
create policy "Users can view own login logs"
  on public.login_logs
  for select
  to authenticated
  using (user_id = auth.uid());

-- Only service role can insert (done server-side via admin client)
