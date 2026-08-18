create table if not exists public.availability_slots (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  service_type request_type not null default 'TABLE',
  slot_date date not null,
  title text not null,
  area text,
  min_spend text,
  capacity integer,
  status text not null default 'AVAILABLE' check (status in ('AVAILABLE', 'LIMITED', 'WAITLIST', 'SOLD_OUT')),
  notes text,
  active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_availability_slots_lookup
  on public.availability_slots(club_id, slot_date, status, active);

create unique index if not exists idx_availability_slots_unique_active
  on public.availability_slots(club_id, service_type, slot_date, lower(title))
  where active = true;

drop trigger if exists set_availability_slots_updated_at on public.availability_slots;
create trigger set_availability_slots_updated_at
before update on public.availability_slots
for each row execute function public.set_updated_at();

create table if not exists public.request_offers (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  availability_slot_id uuid references public.availability_slots(id) on delete set null,
  created_by uuid references public.profiles(id),
  offer_status text not null default 'DRAFT' check (offer_status in ('DRAFT', 'SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED')),
  venue_name text not null,
  offer_date date not null,
  service_label text not null,
  arrival_time text,
  guest_count integer not null default 1 check (guest_count between 1 and 200),
  min_spend text,
  message text not null,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_request_offers_request_created
  on public.request_offers(request_id, created_at desc);

create index if not exists idx_request_offers_status
  on public.request_offers(offer_status, offer_date);

drop trigger if exists set_request_offers_updated_at on public.request_offers;
create trigger set_request_offers_updated_at
before update on public.request_offers
for each row execute function public.set_updated_at();

alter table public.availability_slots enable row level security;
alter table public.request_offers enable row level security;

drop policy if exists "availability_slots_staff_select" on public.availability_slots;
create policy "availability_slots_staff_select" on public.availability_slots
for select using (
  public.current_profile_role() in ('SUPER_ADMIN', 'PROMOTER_MANAGER', 'PROMOTER')
);

drop policy if exists "availability_slots_manager_write" on public.availability_slots;
create policy "availability_slots_manager_write" on public.availability_slots
for all using (
  public.current_profile_role() in ('SUPER_ADMIN', 'PROMOTER_MANAGER')
) with check (
  public.current_profile_role() in ('SUPER_ADMIN', 'PROMOTER_MANAGER')
);

drop policy if exists "request_offers_staff_select" on public.request_offers;
create policy "request_offers_staff_select" on public.request_offers
for select using (
  public.current_profile_role() in ('SUPER_ADMIN', 'PROMOTER_MANAGER', 'PROMOTER')
);

drop policy if exists "request_offers_staff_write" on public.request_offers;
create policy "request_offers_staff_write" on public.request_offers
for all using (
  public.current_profile_role() in ('SUPER_ADMIN', 'PROMOTER_MANAGER', 'PROMOTER')
) with check (
  public.current_profile_role() in ('SUPER_ADMIN', 'PROMOTER_MANAGER', 'PROMOTER')
);

insert into public.availability_slots
  (club_id, service_type, slot_date, title, area, min_spend, capacity, status, notes, active)
select c.id, 'TABLE'::request_type, current_date, 'Main room table', c.city, 'From 1k', 6, 'AVAILABLE', 'Demo availability. Adjust before sending live offers.', true
from public.clubs c
where c.slug in ('la-plage-casanis', 'le-jade', 'mamzel')
on conflict do nothing;
