create table if not exists public.concierge_packages (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text,
  request_type public.request_type not null default 'PACKAGE',
  price_hint text,
  tailored_client_id uuid references public.clients(id) on delete set null,
  active boolean not null default true,
  package_items jsonb not null default '[]'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_concierge_packages_active
  on public.concierge_packages(active, request_type, created_at desc);

drop trigger if exists set_concierge_packages_updated_at on public.concierge_packages;
create trigger set_concierge_packages_updated_at
before update on public.concierge_packages
for each row execute function public.set_updated_at();

alter table public.concierge_packages enable row level security;

drop policy if exists "concierge_packages_select_staff" on public.concierge_packages;
create policy "concierge_packages_select_staff" on public.concierge_packages
for select using (
  public.current_profile_role() in ('SUPER_ADMIN', 'PROMOTER_MANAGER', 'PROMOTER')
);

drop policy if exists "concierge_packages_manage_staff" on public.concierge_packages;
create policy "concierge_packages_manage_staff" on public.concierge_packages
for all using (
  public.current_profile_role() in ('SUPER_ADMIN', 'PROMOTER_MANAGER')
) with check (
  public.current_profile_role() in ('SUPER_ADMIN', 'PROMOTER_MANAGER')
);

insert into public.clubs (name, slug, city, description, image_url, venue_kind, brand_config, service_config, active)
values (
  'Marbella Concierge',
  'marbella-concierge',
  'Marbella',
  'Boats, golf, villas, transfers, schedules, and tailored concierge packages.',
  null,
  'CONCIERGE',
  '{"monogram":"MC","tagline":"Boats, villas, transfers, golf, and tailored stays","mood":"Full-stay concierge"}'::jsonb,
  '[
    {"id":"yacht-day","label":"Boat or yacht day","description":"Private boat, yacht, skipper, route, and onboard requests.","priceHint":"Options checked by size and date","requestType":"BOAT","icon":"ShipWheel"},
    {"id":"golf-day","label":"Golf booking","description":"Tee times, clubs, buggies, transfers, and lunch after.","priceHint":"Course and tee time confirmed first","requestType":"GOLF","icon":"Flag"},
    {"id":"villa-hotel","label":"Hotel or private villa","description":"Hotel suites, villas, private chef, security, or hosted stay needs.","priceHint":"Tell us dates and group size","requestType":"VILLA","icon":"Hotel"},
    {"id":"chauffeur","label":"Transfers and chauffeur","description":"Airport pickup, driver by the hour, and late-night movement.","priceHint":"Route and vehicle confirmed on WhatsApp","requestType":"TRANSFER","icon":"Car"},
    {"id":"full-schedule","label":"Full schedule planning","description":"Beach clubs, restaurants, nightlife, DJs, and movement across days.","priceHint":"Personal plan sent back to you","requestType":"SCHEDULE","icon":"CalendarRange"},
    {"id":"tailored-package","label":"Tailored package","description":"A ready-made or custom plan for the whole stay.","priceHint":"Built around your group","requestType":"PACKAGE","icon":"Package"}
  ]'::jsonb,
  true
)
on conflict (slug) do update set
  city = excluded.city,
  description = excluded.description,
  venue_kind = excluded.venue_kind,
  brand_config = excluded.brand_config,
  service_config = excluded.service_config,
  active = true,
  updated_at = now();

insert into public.concierge_packages (title, slug, description, request_type, price_hint, package_items, active)
values
  (
    'Marbella Weekend Starter',
    'marbella-weekend-starter',
    'A clean weekend plan with beach club, dinner, nightlife, and transfers.',
    'PACKAGE',
    'Tailored after dates and group size',
    '["Beach club day", "Dinner reservation", "Nightclub table or guestlist", "Transfer plan"]'::jsonb,
    true
  ),
  (
    'High-Spend Party Trail',
    'high-spend-party-trail',
    'Priority party schedule with stronger venues, DJ-led nights, and private movement.',
    'SCHEDULE',
    'Best for groups wanting a hosted itinerary',
    '["DJ-led beach club", "Premium dinner", "Nightclub table", "Private chauffeur"]'::jsonb,
    true
  ),
  (
    'Yacht Day Add-On',
    'yacht-day-add-on',
    'Boat or yacht request with route, drinks, lunch, and transfer coordination.',
    'BOAT',
    'Quoted by yacht size and date',
    '["Yacht options", "Skipper", "Drinks request", "Pickup and return transfer"]'::jsonb,
    true
  )
on conflict (slug) do update set
  title = excluded.title,
  description = excluded.description,
  request_type = excluded.request_type,
  price_hint = excluded.price_hint,
  package_items = excluded.package_items,
  active = excluded.active,
  updated_at = now();
