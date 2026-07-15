create table if not exists public.schedule_venue_rules (
  id uuid primary key default gen_random_uuid(),
  venue_name text not null,
  venue_type text not null default 'HYBRID' check (venue_type in ('BEACH_CLUB', 'RESTAURANT', 'NIGHTCLUB', 'AFTER_PARTY', 'HYBRID')),
  area text,
  priority_days text[] not null default '{}'::text[],
  weight numeric(4,2) not null default 1 check (weight >= 0.1 and weight <= 10),
  avoid_after_venue_names text[] not null default '{}'::text[],
  guidance text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_schedule_venue_rules_active_weight
  on public.schedule_venue_rules(active, weight desc, venue_name);

create unique index if not exists idx_schedule_venue_rules_venue_name_unique
  on public.schedule_venue_rules(lower(venue_name));

drop trigger if exists set_schedule_venue_rules_updated_at on public.schedule_venue_rules;
create trigger set_schedule_venue_rules_updated_at
before update on public.schedule_venue_rules
for each row execute function public.set_updated_at();

alter table public.schedule_venue_rules enable row level security;

drop policy if exists "schedule_venue_rules_select_staff" on public.schedule_venue_rules;
create policy "schedule_venue_rules_select_staff" on public.schedule_venue_rules
for select using (
  public.current_profile_role() in ('SUPER_ADMIN', 'PROMOTER_MANAGER', 'PROMOTER')
);

drop policy if exists "schedule_venue_rules_admin_all" on public.schedule_venue_rules;
create policy "schedule_venue_rules_admin_all" on public.schedule_venue_rules
for all using (public.is_super_admin()) with check (public.is_super_admin());

insert into public.schedule_venue_rules
  (venue_name, venue_type, area, priority_days, weight, avoid_after_venue_names, guidance, active)
values
  ('La Plage Casanis', 'BEACH_CLUB', 'Elviria', array['WEDNESDAY','SUNDAY'], 3.5, array[]::text[], 'Wednesday and Sunday are party days with DJs until 00:00. Do not treat it as only lunch or dinner.', true),
  ('Le Jade', 'AFTER_PARTY', 'Marbella', array['WEDNESDAY','SUNDAY'], 3.25, array[]::text[], 'Best used after La Plage Casanis on Wednesday and Sunday, or as a late intimate after-party.', true),
  ('Playa Padre', 'BEACH_CLUB', 'Marbella beach', array[]::text[], 1.35, array[]::text[], 'Strong party beach club alternative when programming or a DJ fits the client.', true),
  ('La Cabane', 'BEACH_CLUB', 'Los Monteros', array[]::text[], 1.15, array[]::text[], 'Elegant high-spend daytime option.', true),
  ('Nikki Beach Marbella', 'BEACH_CLUB', 'Elviria', array[]::text[], 1.1, array[]::text[], 'International high-spend champagne beach club option.', true),
  ('Mamzel', 'HYBRID', 'Marbella', array[]::text[], 1.45, array[]::text[], 'Dinner show and celebration energy. Can replace both dinner and early party.', true),
  ('Motel Particulier', 'HYBRID', 'Marbella', array[]::text[], 1.05, array['Bon Bonniere'], 'Dinner and late lounge feel. Avoid pairing with a heavy late club like Bon Bonniere in the same night unless the client asks for a very big night.', true),
  ('Nobu Marbella', 'RESTAURANT', 'Puente Romano', array[]::text[], 1.1, array[]::text[], 'Safe high-spend restaurant recommendation.', true),
  ('Cipriani Marbella', 'RESTAURANT', 'Puente Romano', array[]::text[], 1.05, array[]::text[], 'Classic polished high-spend dinner.', true),
  ('GAIA Marbella', 'RESTAURANT', 'Puente Romano', array[]::text[], 1.15, array[]::text[], 'High-spend dinner option before a club night.', true),
  ('Coya Marbella', 'RESTAURANT', 'Puente Romano', array[]::text[], 1.15, array[]::text[], 'High-spend dinner option before a club night.', true),
  ('Momento', 'NIGHTCLUB', 'Marbella', array[]::text[], 1.4, array[]::text[], 'Prime late-night club, especially with a known DJ.', true),
  ('Bon Bonniere', 'NIGHTCLUB', 'Marbella', array[]::text[], 1.25, array['Motel Particulier'], 'Late table-driven club. Avoid after Motel Particulier unless the client wants a very heavy night.', true),
  ('Pangea', 'NIGHTCLUB', 'Puerto Banus', array[]::text[], 1.05, array[]::text[], 'Late-night option and useful alternative to Bon Bonniere.', true),
  ('Olivia Valere', 'NIGHTCLUB', 'Marbella', array[]::text[], 0.85, array[]::text[], 'Classic Marbella club fallback.', true)
on conflict (lower(venue_name)) do update set
  venue_type = excluded.venue_type,
  area = excluded.area,
  priority_days = excluded.priority_days,
  weight = excluded.weight,
  avoid_after_venue_names = excluded.avoid_after_venue_names,
  guidance = excluded.guidance,
  active = excluded.active;
