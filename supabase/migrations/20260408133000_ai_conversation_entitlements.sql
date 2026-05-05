create table if not exists public.ai_conversation_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  entry_id uuid references public.entries (id) on delete set null,
  source text not null default 'qr_create',
  locale text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists ai_conversation_events_user_created_at_idx
  on public.ai_conversation_events (user_id, created_at desc);

alter table public.ai_conversation_events enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'ai_conversation_events'
      and policyname = 'ai_conversation_events_owner_read'
  ) then
    create policy "ai_conversation_events_owner_read"
    on public.ai_conversation_events
    for select
    using (auth.uid() = user_id);
  end if;
end $$;
