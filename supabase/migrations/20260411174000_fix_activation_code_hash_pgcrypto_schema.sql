create or replace function public.hash_activation_code(raw_code text)
returns text
language sql
immutable
as $$
  select encode(extensions.digest(public.normalize_activation_code(raw_code), 'sha256'), 'hex');
$$;
