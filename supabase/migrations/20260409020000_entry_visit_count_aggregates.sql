create or replace function public.get_entry_visit_counts(p_entry_ids uuid[])
returns table (
  entry_id uuid,
  visit_count bigint
)
language sql
security definer
set search_path = public
as $$
  select
    visits.entry_id,
    count(*)::bigint as visit_count
  from public.entry_visits as visits
  join public.entries as entries
    on entries.id = visits.entry_id
  where auth.uid() is not null
    and entries.user_id = auth.uid()
    and visits.entry_id = any(coalesce(p_entry_ids, array[]::uuid[]))
  group by visits.entry_id;
$$;

grant execute on function public.get_entry_visit_counts(uuid[]) to authenticated;
