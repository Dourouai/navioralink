create index if not exists entry_targets_vcard_content_id_idx
  on public.entry_targets ((vcard->>'contentId'))
  where kind = 'vcard';
