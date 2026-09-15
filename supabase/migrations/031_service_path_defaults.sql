create table if not exists public.service_path_defaults (
  id uuid primary key default gen_random_uuid(),
  request_type request_type not null unique,
  customer_title text not null,
  customer_intro text,
  detail_prompt text,
  question_prompts jsonb not null default '[]'::jsonb,
  default_addons jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_service_path_defaults_updated_at on public.service_path_defaults;
create trigger set_service_path_defaults_updated_at
before update on public.service_path_defaults
for each row execute function public.set_updated_at();

alter table public.service_path_defaults enable row level security;

drop policy if exists "service_path_defaults_select_staff" on public.service_path_defaults;
create policy "service_path_defaults_select_staff" on public.service_path_defaults
for select using (
  public.current_profile_role() in ('SUPER_ADMIN', 'PROMOTER_MANAGER', 'PROMOTER')
);

drop policy if exists "service_path_defaults_manage_staff" on public.service_path_defaults;
create policy "service_path_defaults_manage_staff" on public.service_path_defaults
for all using (
  public.current_profile_role() in ('SUPER_ADMIN', 'PROMOTER_MANAGER')
) with check (
  public.current_profile_role() in ('SUPER_ADMIN', 'PROMOTER_MANAGER')
);

insert into public.service_path_defaults
  (request_type, customer_title, customer_intro, detail_prompt, question_prompts, default_addons, active)
values
  ('TABLE', 'Nightclub table', 'Tell us the venue and date. Your host will check table options and minimum spend.', 'Add preferred area, spend, arrival time, or music preference.', '["Preferred table area?", "Flexible on venue?", "Any DJ or music preference?"]'::jsonb, '{}'::jsonb, true),
  ('GUESTLIST', 'Guestlist', 'Quick guestlist request. Your host will confirm names, timing, and availability.', 'Add arrival time and anything the door team should know.', '["Approximate arrival time?", "All guests together?", "Any birthday or celebration?"]'::jsonb, '{}'::jsonb, true),
  ('VIP_SERVICE', 'Beach club or VIP service', 'For beach clubs, lunch, daybeds, drinks, and hosted daytime plans.', 'Add arrival time, preferred area, and any bottle or food preferences.', '["Sunbeds or table?", "Lunch included?", "Preferred music or vibe?"]'::jsonb, '{"addonBeachClub":1}'::jsonb, true),
  ('BOAT', 'Boat or yacht day', 'Tell us the group size and preferred day. Your host will check suitable boats and routes.', 'Add boat style, marina, timing, and onboard preferences.', '["Half day or full day?", "Open to different boat sizes?", "Any food or drinks onboard?"]'::jsonb, '{"addonYacht":1,"addonTransfer":1}'::jsonb, true),
  ('GOLF', 'Golf booking', 'Tell us dates and group size. Your host will check tee times and course options.', 'Add preferred tee time, course, handicap level, and transport needs.', '["Morning or afternoon tee time?", "Need clubs or buggies?", "Dinner after golf?"]'::jsonb, '{"addonGolf":1,"addonDinner":1,"addonTransfer":1}'::jsonb, true),
  ('VILLA', 'Hotel or private villa', 'Share dates, group size, and area preference. Your host will check suitable stays.', 'Add bedrooms, preferred area, service level, and any private extras.', '["Hotel or private villa?", "How many bedrooms?", "Need chef, security, or drivers?"]'::jsonb, '{"addonVilla":1,"addonTransfer":1}'::jsonb, true),
  ('TRANSFER', 'Transfers and chauffeurs', 'Tell us pickup, drop-off, and timing. Your host will arrange the right vehicle.', 'Add flight details, number of passengers, luggage, and driver timing.', '["Airport or local transfer?", "How many passengers?", "Need driver by the hour?"]'::jsonb, '{"addonTransfer":1}'::jsonb, true),
  ('SCHEDULE', 'Full stay planning', 'Build the whole Marbella plan: beach, dinner, nightlife, drivers, and special requests.', 'Add dates, group style, spend level, and what you want included.', '["Party focused or balanced?", "High spend or normal?", "Any must-go venues or DJs?"]'::jsonb, '{"addonBeachClub":2,"addonDinner":2,"addonNightclub":2,"addonTransfer":2}'::jsonb, true),
  ('PACKAGE', 'Curated package', 'Choose a starting package and tailor it around your group, dates, and spend.', 'Add what should be included and what can be flexible.', '["Which package style fits best?", "How many days?", "Any must-have experiences?"]'::jsonb, '{"addonBeachClub":1,"addonDinner":1,"addonNightclub":1,"addonTransfer":1}'::jsonb, true),
  ('GENERAL', 'Something else', 'Send the request and your host will point it to the right person.', 'Add the practical details and preferred timing.', '["What do you need?", "Which date?", "How quickly do you need an answer?"]'::jsonb, '{}'::jsonb, true)
on conflict (request_type) do update set
  customer_title = excluded.customer_title,
  customer_intro = excluded.customer_intro,
  detail_prompt = excluded.detail_prompt,
  question_prompts = excluded.question_prompts,
  default_addons = excluded.default_addons,
  active = excluded.active;
