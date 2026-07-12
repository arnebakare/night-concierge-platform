create table if not exists public.retention_outreach (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  channel text not null check (channel in ('WHATSAPP', 'EMAIL')),
  destination text not null,
  message text not null,
  status public.notification_status not null default 'PENDING',
  provider text,
  provider_message_id text,
  error_message text,
  automatic boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_retention_outreach_client_created
  on public.retention_outreach(client_id, created_at desc);

create index if not exists idx_retention_outreach_status_created
  on public.retention_outreach(status, created_at desc);

alter table public.retention_outreach enable row level security;

create policy "retention_outreach_select_staff" on public.retention_outreach
for select using (
  public.current_profile_role() in ('SUPER_ADMIN', 'PROMOTER_MANAGER', 'PROMOTER')
);

create policy "retention_outreach_insert_staff" on public.retention_outreach
for insert with check (
  public.current_profile_role() in ('SUPER_ADMIN', 'PROMOTER_MANAGER', 'PROMOTER')
  and (user_id = auth.uid() or public.is_super_admin())
);
