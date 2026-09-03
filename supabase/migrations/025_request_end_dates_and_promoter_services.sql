alter table public.requests
  add column if not exists requested_date_end date;

create table if not exists public.promoter_service_eligibility (
  id uuid primary key default gen_random_uuid(),
  promoter_id uuid not null references public.profiles(id) on delete cascade,
  request_type public.request_type not null,
  eligible boolean not null default true,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(promoter_id, request_type)
);

create index if not exists idx_promoter_service_eligibility_promoter
  on public.promoter_service_eligibility(promoter_id, request_type);

drop trigger if exists set_promoter_service_eligibility_updated_at on public.promoter_service_eligibility;
create trigger set_promoter_service_eligibility_updated_at
before update on public.promoter_service_eligibility
for each row execute function public.set_updated_at();

alter table public.promoter_service_eligibility enable row level security;

drop policy if exists "promoter_service_eligibility_select_staff" on public.promoter_service_eligibility;
create policy "promoter_service_eligibility_select_staff" on public.promoter_service_eligibility
for select using (
  public.current_profile_role() in ('SUPER_ADMIN', 'PROMOTER_MANAGER')
  or promoter_id = auth.uid()
);

drop policy if exists "promoter_service_eligibility_manage_staff" on public.promoter_service_eligibility;
create policy "promoter_service_eligibility_manage_staff" on public.promoter_service_eligibility
for all using (
  public.current_profile_role() = 'SUPER_ADMIN'
  or (
    public.current_profile_role() = 'PROMOTER_MANAGER'
    and promoter_id in (select id from public.profiles where manager_id = auth.uid() and role = 'PROMOTER')
  )
) with check (
  public.current_profile_role() = 'SUPER_ADMIN'
  or (
    public.current_profile_role() = 'PROMOTER_MANAGER'
    and promoter_id in (select id from public.profiles where manager_id = auth.uid() and role = 'PROMOTER')
  )
);
