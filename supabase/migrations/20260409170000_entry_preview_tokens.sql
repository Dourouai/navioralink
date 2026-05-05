create table if not exists public.entry_preview_tokens (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.entries (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  surface text not null check (surface in ('go', 'page')),
  token text not null unique,
  expires_at timestamptz not null,
  invalidated_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists entry_preview_tokens_entry_id_created_at_idx
  on public.entry_preview_tokens (entry_id, created_at desc);

create index if not exists entry_preview_tokens_user_id_created_at_idx
  on public.entry_preview_tokens (user_id, created_at desc);

create index if not exists entry_preview_tokens_active_token_idx
  on public.entry_preview_tokens (token)
  where invalidated_at is null;

alter table public.entry_preview_tokens enable row level security;

create policy "entry_preview_tokens_owner_all"
on public.entry_preview_tokens
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
