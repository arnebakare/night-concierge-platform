create table if not exists public.request_payments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  provider text not null default 'stripe',
  provider_checkout_session_id text unique,
  provider_payment_intent_id text,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'eur',
  description text not null,
  status text not null default 'PENDING' check (status in ('PENDING', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED')),
  checkout_url text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_request_payments_request_created
  on public.request_payments(request_id, created_at desc);

create index if not exists idx_request_payments_status_created
  on public.request_payments(status, created_at desc);

drop trigger if exists set_request_payments_updated_at on public.request_payments;
create trigger set_request_payments_updated_at
before update on public.request_payments
for each row execute function public.set_updated_at();

create table if not exists public.commission_rules (
  id uuid primary key default gen_random_uuid(),
  promoter_id uuid references public.profiles(id) on delete cascade,
  club_id uuid references public.clubs(id) on delete cascade,
  request_type request_type,
  rate_percent numeric(6,2) not null default 10 check (rate_percent >= 0 and rate_percent <= 100),
  flat_fee_cents integer not null default 0 check (flat_fee_cents >= 0),
  active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_commission_rules_lookup
  on public.commission_rules(promoter_id, club_id, request_type, active);

drop trigger if exists set_commission_rules_updated_at on public.commission_rules;
create trigger set_commission_rules_updated_at
before update on public.commission_rules
for each row execute function public.set_updated_at();

alter table public.request_payments enable row level security;
alter table public.commission_rules enable row level security;

drop policy if exists "request_payments_select_staff" on public.request_payments;
create policy "request_payments_select_staff" on public.request_payments
for select using (
  public.current_profile_role() in ('SUPER_ADMIN', 'PROMOTER_MANAGER', 'PROMOTER')
);

drop policy if exists "request_payments_write_staff" on public.request_payments;
create policy "request_payments_write_staff" on public.request_payments
for all using (
  public.current_profile_role() in ('SUPER_ADMIN', 'PROMOTER_MANAGER', 'PROMOTER')
) with check (
  public.current_profile_role() in ('SUPER_ADMIN', 'PROMOTER_MANAGER', 'PROMOTER')
);

drop policy if exists "commission_rules_select_staff" on public.commission_rules;
create policy "commission_rules_select_staff" on public.commission_rules
for select using (
  public.current_profile_role() in ('SUPER_ADMIN', 'PROMOTER_MANAGER', 'PROMOTER')
);

drop policy if exists "commission_rules_manage_managers" on public.commission_rules;
create policy "commission_rules_manage_managers" on public.commission_rules
for all using (
  public.current_profile_role() in ('SUPER_ADMIN', 'PROMOTER_MANAGER')
) with check (
  public.current_profile_role() in ('SUPER_ADMIN', 'PROMOTER_MANAGER')
);
