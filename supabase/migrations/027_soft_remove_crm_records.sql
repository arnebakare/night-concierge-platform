alter table public.requests
  add column if not exists removed_at timestamptz,
  add column if not exists removed_by uuid references public.profiles(id) on delete set null,
  add column if not exists removal_reason text;

alter table public.clients
  add column if not exists removed_at timestamptz,
  add column if not exists removed_by uuid references public.profiles(id) on delete set null,
  add column if not exists removal_reason text;

create index if not exists idx_requests_not_removed
  on public.requests(requested_date, created_at)
  where removed_at is null;

create index if not exists idx_clients_not_removed
  on public.clients(updated_at)
  where removed_at is null;
