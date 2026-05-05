create index if not exists subscriptions_provider_customer_id_idx
on public.subscriptions (provider, provider_customer_id);

create unique index if not exists billing_events_provider_event_id_idx
on public.billing_events (provider, provider_event_id)
where provider_event_id is not null;
