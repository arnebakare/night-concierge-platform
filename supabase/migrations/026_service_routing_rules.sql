create table if not exists public.service_routing_rules (
  id uuid primary key default gen_random_uuid(),
  request_type public.request_type not null unique,
  default_promoter_id uuid references public.profiles(id) on delete set null,
  fallback_promoter_id uuid references public.profiles(id) on delete set null,
  manager_id uuid references public.profiles(id) on delete set null,
  active boolean not null default true,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_service_routing_rules_request_type
  on public.service_routing_rules(request_type)
  where active = true;

drop trigger if exists set_service_routing_rules_updated_at on public.service_routing_rules;
create trigger set_service_routing_rules_updated_at
before update on public.service_routing_rules
for each row execute function public.set_updated_at();

alter table public.service_routing_rules enable row level security;

drop policy if exists "service_routing_rules_select_staff" on public.service_routing_rules;
create policy "service_routing_rules_select_staff" on public.service_routing_rules
for select using (
  public.current_profile_role() in ('SUPER_ADMIN', 'PROMOTER_MANAGER')
);

drop policy if exists "service_routing_rules_manage_staff" on public.service_routing_rules;
create policy "service_routing_rules_manage_staff" on public.service_routing_rules
for all using (
  public.current_profile_role() = 'SUPER_ADMIN'
  or (
    public.current_profile_role() = 'PROMOTER_MANAGER'
    and (
      default_promoter_id is null
      or default_promoter_id in (select id from public.profiles where manager_id = auth.uid() and role = 'PROMOTER')
    )
    and (
      fallback_promoter_id is null
      or fallback_promoter_id in (select id from public.profiles where manager_id = auth.uid() and role = 'PROMOTER')
    )
    and (manager_id is null or manager_id = auth.uid())
  )
) with check (
  public.current_profile_role() = 'SUPER_ADMIN'
  or (
    public.current_profile_role() = 'PROMOTER_MANAGER'
    and (
      default_promoter_id is null
      or default_promoter_id in (select id from public.profiles where manager_id = auth.uid() and role = 'PROMOTER')
    )
    and (
      fallback_promoter_id is null
      or fallback_promoter_id in (select id from public.profiles where manager_id = auth.uid() and role = 'PROMOTER')
    )
    and (manager_id is null or manager_id = auth.uid())
  )
);

insert into public.service_routing_rules (request_type, active, notes)
values
  ('TABLE', true, 'Nightlife table requests'),
  ('GUESTLIST', true, 'Guestlist requests'),
  ('VIP_SERVICE', true, 'VIP nightlife service'),
  ('BOAT', true, 'Boats and yachts'),
  ('GOLF', true, 'Golf requests'),
  ('VILLA', true, 'Hotels and private villas'),
  ('TRANSFER', true, 'Transfers and chauffeurs'),
  ('SCHEDULE', true, 'Full schedule planning'),
  ('PACKAGE', true, 'Packages'),
  ('GENERAL', true, 'General concierge requests')
on conflict (request_type) do nothing;
