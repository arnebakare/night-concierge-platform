alter table public.inbound_whatsapp_messages
  add column if not exists alert_sent_at timestamptz;

alter table public.commission_rules
  add column if not exists label text,
  add column if not exists notes text;

create index if not exists idx_inbound_whatsapp_alerts
  on public.inbound_whatsapp_messages(status, alert_sent_at, created_at desc);
