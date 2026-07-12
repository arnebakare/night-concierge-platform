create table if not exists public.inbound_whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'twilio',
  provider_message_id text unique,
  from_number text not null,
  to_number text,
  profile_name text,
  body text not null,
  source_profile_id uuid references public.profiles(id) on delete set null,
  matched_client_id uuid references public.clients(id) on delete set null,
  created_request_id uuid references public.requests(id) on delete set null,
  status text not null default 'RECEIVED' check (status in ('RECEIVED', 'CREATED', 'NEEDS_REVIEW', 'IGNORED', 'FAILED')),
  parse_result jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists idx_inbound_whatsapp_created
  on public.inbound_whatsapp_messages(created_at desc);

create index if not exists idx_inbound_whatsapp_status_created
  on public.inbound_whatsapp_messages(status, created_at desc);

create index if not exists idx_inbound_whatsapp_request
  on public.inbound_whatsapp_messages(created_request_id);

alter table public.inbound_whatsapp_messages enable row level security;

create policy "inbound_whatsapp_select_staff" on public.inbound_whatsapp_messages
for select using (
  public.current_profile_role() in ('SUPER_ADMIN', 'PROMOTER_MANAGER', 'PROMOTER')
);
