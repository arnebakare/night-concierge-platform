alter table public.events
  add column if not exists source_url text,
  add column if not exists source_key text,
  add column if not exists imported_at timestamptz;

create unique index if not exists events_source_key_unique
  on public.events(source_key)
  where source_key is not null;

create table if not exists public.event_import_runs (
  id uuid primary key default gen_random_uuid(),
  source_slug text not null,
  source_name text not null,
  source_url text,
  status text not null check (status in ('OK', 'WARNING', 'FAILED')),
  http_status integer,
  message text,
  events_found integer not null default 0,
  events_created integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists event_import_runs_created_idx
  on public.event_import_runs(created_at desc);

alter table public.event_import_runs enable row level security;

drop policy if exists "event_import_runs_select_staff" on public.event_import_runs;
create policy "event_import_runs_select_staff" on public.event_import_runs
  for select using (
    public.current_profile_role() in ('SUPER_ADMIN', 'PROMOTER_MANAGER')
  );

drop policy if exists "event_import_runs_service_write" on public.event_import_runs;
create policy "event_import_runs_service_write" on public.event_import_runs
  for all using (
    public.current_profile_role() in ('SUPER_ADMIN', 'PROMOTER_MANAGER')
  )
  with check (
    public.current_profile_role() in ('SUPER_ADMIN', 'PROMOTER_MANAGER')
  );

insert into public.clubs (name, slug, city, active)
values
  ('Playa Padre', 'playa-padre', 'Marbella', true),
  ('Momento', 'momento', 'Marbella', true),
  ('Motel Particulier', 'motel-particulier', 'Marbella', true),
  ('La Cabane', 'la-cabane', 'Marbella', true),
  ('Bon Bonniere', 'bon-bonniere', 'Marbella', true)
on conflict (slug) do update set
  name = excluded.name,
  city = excluded.city,
  active = true,
  updated_at = now();
