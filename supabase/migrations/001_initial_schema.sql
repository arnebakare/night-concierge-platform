create extension if not exists "pgcrypto";

create type public.profile_role as enum ('SUPER_ADMIN', 'PROMOTER_MANAGER', 'PROMOTER', 'CLIENT');
create type public.vip_level as enum ('STANDARD', 'SILVER', 'GOLD', 'PLATINUM');
create type public.client_status as enum ('NORMAL', 'WATCHLIST', 'MANAGER_APPROVAL_REQUIRED', 'BLOCKED');
create type public.note_visibility as enum ('GLOBAL', 'CLUB_ONLY', 'MANAGER_ONLY', 'PRIVATE_TO_AUTHOR');
create type public.note_type as enum ('PREFERENCE', 'SPENDING', 'BEHAVIOR', 'RELIABILITY', 'GUESTLIST', 'WARNING', 'BLOCKED', 'INTERNAL');
create type public.request_source as enum ('PUBLIC_FORM', 'PROMOTER_LINK', 'MAGIC_LINK', 'MANUAL_ENTRY', 'ADMIN_CREATED');
create type public.request_type as enum ('GUESTLIST', 'TABLE', 'VIP_SERVICE', 'GENERAL');
create type public.request_status as enum ('NEW', 'CONTACTED', 'PENDING', 'CONFIRMED', 'ARRIVED', 'NO_SHOW', 'DECLINED', 'CANCELLED');
create type public.notification_status as enum ('PENDING', 'SENT', 'FAILED');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text,
  phone text,
  role public.profile_role not null default 'CLIENT',
  manager_id uuid references public.profiles(id),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  city text not null,
  address text,
  description text,
  image_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.club_users (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_at_club text not null,
  created_at timestamptz not null default now(),
  unique (club_id, user_id)
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  email text,
  instagram text,
  date_of_birth date,
  city text,
  vip_level public.vip_level not null default 'STANDARD',
  status public.client_status not null default 'NORMAL',
  created_by_user_id uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (phone)
);

create table public.requests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id),
  club_id uuid not null references public.clubs(id),
  promoter_id uuid references public.profiles(id),
  assigned_manager_id uuid references public.profiles(id),
  source public.request_source not null,
  request_type public.request_type not null,
  status public.request_status not null default 'NEW',
  requested_date date not null,
  arrival_time text,
  guest_count integer not null check (guest_count > 0),
  budget text,
  message text,
  internal_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.client_notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  club_id uuid references public.clubs(id),
  request_id uuid references public.requests(id) on delete set null,
  author_id uuid not null references public.profiles(id),
  visibility public.note_visibility not null,
  note_type public.note_type not null,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.promoter_links (
  id uuid primary key default gen_random_uuid(),
  promoter_id uuid not null references public.profiles(id) on delete cascade,
  club_id uuid references public.clubs(id) on delete set null,
  slug text not null unique,
  title text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  name text not null,
  slug text not null,
  event_date date not null,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (club_id, slug)
);

create table public.magic_links (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  client_id uuid references public.clients(id) on delete set null,
  promoter_id uuid references public.profiles(id) on delete set null,
  club_id uuid references public.clubs(id) on delete set null,
  event_id uuid references public.events(id) on delete set null,
  expires_at timestamptz,
  max_uses integer check (max_uses is null or max_uses > 0),
  use_count integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.platform_settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.whatsapp_notifications (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  destination_number text not null,
  message text not null,
  provider text not null,
  provider_message_id text,
  status public.notification_status not null default 'PENDING',
  error_message text,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_profiles_role on public.profiles(role);
create index idx_profiles_manager on public.profiles(manager_id);
create index idx_club_users_user on public.club_users(user_id);
create index idx_clients_phone on public.clients(phone);
create index idx_requests_promoter_date on public.requests(promoter_id, requested_date);
create index idx_requests_manager_date on public.requests(assigned_manager_id, requested_date);
create index idx_requests_status on public.requests(status);
create index idx_notes_client on public.client_notes(client_id);
create index idx_promoter_links_promoter on public.promoter_links(promoter_id);
create index idx_magic_links_token on public.magic_links(token);
create index idx_audit_entity on public.audit_logs(entity_type, entity_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger set_clubs_updated_at before update on public.clubs for each row execute function public.set_updated_at();
create trigger set_clients_updated_at before update on public.clients for each row execute function public.set_updated_at();
create trigger set_requests_updated_at before update on public.requests for each row execute function public.set_updated_at();
create trigger set_client_notes_updated_at before update on public.client_notes for each row execute function public.set_updated_at();
create trigger set_promoter_links_updated_at before update on public.promoter_links for each row execute function public.set_updated_at();
create trigger set_magic_links_updated_at before update on public.magic_links for each row execute function public.set_updated_at();
create trigger set_events_updated_at before update on public.events for each row execute function public.set_updated_at();
create trigger set_platform_settings_updated_at before update on public.platform_settings for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce((new.raw_user_meta_data->>'role')::public.profile_role, 'CLIENT')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.current_profile_role()
returns public.profile_role
language sql
security definer
stable
as $$
  select role from public.profiles where id = auth.uid() and active = true;
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
security definer
stable
as $$
  select public.current_profile_role() = 'SUPER_ADMIN';
$$;

create or replace function public.is_manager_for(promoter uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = promoter
      and manager_id = auth.uid()
      and public.current_profile_role() = 'PROMOTER_MANAGER'
  );
$$;

create or replace function public.user_has_club(club uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.club_users
    where club_id = club
      and user_id = auth.uid()
  );
$$;

alter table public.profiles enable row level security;
alter table public.clubs enable row level security;
alter table public.club_users enable row level security;
alter table public.clients enable row level security;
alter table public.requests enable row level security;
alter table public.client_notes enable row level security;
alter table public.promoter_links enable row level security;
alter table public.magic_links enable row level security;
alter table public.events enable row level security;
alter table public.platform_settings enable row level security;
alter table public.whatsapp_notifications enable row level security;
alter table public.audit_logs enable row level security;

create policy "profiles_select_scoped" on public.profiles for select using (
  public.is_super_admin()
  or id = auth.uid()
  or manager_id = auth.uid()
  or (public.current_profile_role() = 'PROMOTER_MANAGER' and id in (select user_id from public.club_users where club_id in (select club_id from public.club_users where user_id = auth.uid())))
);
create policy "profiles_update_own_basic" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles_admin_all" on public.profiles for all using (public.is_super_admin()) with check (public.is_super_admin());

create policy "clubs_select_active_or_assigned" on public.clubs for select using (
  active
  or public.is_super_admin()
  or public.user_has_club(id)
);
create policy "clubs_admin_all" on public.clubs for all using (public.is_super_admin()) with check (public.is_super_admin());
create policy "clubs_manager_update_assigned" on public.clubs for update using (
  public.current_profile_role() = 'PROMOTER_MANAGER' and public.user_has_club(id)
) with check (public.current_profile_role() = 'PROMOTER_MANAGER' and public.user_has_club(id));

create policy "club_users_select_scoped" on public.club_users for select using (
  public.is_super_admin()
  or user_id = auth.uid()
  or public.user_has_club(club_id)
);
create policy "club_users_admin_all" on public.club_users for all using (public.is_super_admin()) with check (public.is_super_admin());

create policy "clients_select_scoped" on public.clients for select using (
  public.is_super_admin()
  or created_by_user_id = auth.uid()
  or exists (select 1 from public.requests r where r.client_id = id and (r.promoter_id = auth.uid() or r.assigned_manager_id = auth.uid() or public.is_manager_for(r.promoter_id)))
  or exists (select 1 from public.requests r where r.client_id = id and public.user_has_club(r.club_id) and public.current_profile_role() = 'PROMOTER_MANAGER')
);
create policy "clients_insert_staff" on public.clients for insert with check (
  public.current_profile_role() in ('SUPER_ADMIN', 'PROMOTER_MANAGER', 'PROMOTER')
  and (created_by_user_id = auth.uid() or public.is_super_admin())
);
create policy "clients_update_scoped" on public.clients for update using (
  public.is_super_admin()
  or created_by_user_id = auth.uid()
  or exists (select 1 from public.requests r where r.client_id = id and (r.assigned_manager_id = auth.uid() or public.is_manager_for(r.promoter_id)))
) with check (true);

create policy "requests_select_scoped" on public.requests for select using (
  public.is_super_admin()
  or promoter_id = auth.uid()
  or assigned_manager_id = auth.uid()
  or public.is_manager_for(promoter_id)
  or (public.current_profile_role() = 'PROMOTER_MANAGER' and public.user_has_club(club_id))
  or exists (select 1 from public.clients c where c.id = client_id and c.created_by_user_id = auth.uid() and public.current_profile_role() = 'CLIENT')
);
create policy "requests_insert_staff" on public.requests for insert with check (
  public.current_profile_role() in ('SUPER_ADMIN', 'PROMOTER_MANAGER', 'PROMOTER')
  and (
    public.is_super_admin()
    or promoter_id = auth.uid()
    or assigned_manager_id = auth.uid()
  )
);
create policy "requests_update_scoped" on public.requests for update using (
  public.is_super_admin()
  or promoter_id = auth.uid()
  or assigned_manager_id = auth.uid()
  or public.is_manager_for(promoter_id)
) with check (true);

create policy "notes_select_scoped" on public.client_notes for select using (
  public.is_super_admin()
  or author_id = auth.uid()
  or (
    visibility in ('GLOBAL', 'CLUB_ONLY')
    and exists (select 1 from public.requests r where r.client_id = client_notes.client_id and (r.promoter_id = auth.uid() or r.assigned_manager_id = auth.uid() or public.is_manager_for(r.promoter_id)))
  )
  or (
    visibility = 'MANAGER_ONLY'
    and public.current_profile_role() in ('SUPER_ADMIN', 'PROMOTER_MANAGER')
    and (
      public.user_has_club(club_id)
      or exists (select 1 from public.requests r where r.client_id = client_notes.client_id and (r.assigned_manager_id = auth.uid() or public.is_manager_for(r.promoter_id)))
    )
  )
);
create policy "notes_insert_staff" on public.client_notes for insert with check (
  public.current_profile_role() in ('SUPER_ADMIN', 'PROMOTER_MANAGER', 'PROMOTER')
  and author_id = auth.uid()
  and (visibility <> 'MANAGER_ONLY' or public.current_profile_role() in ('SUPER_ADMIN', 'PROMOTER_MANAGER'))
);
create policy "notes_update_author_or_admin" on public.client_notes for update using (
  public.is_super_admin() or author_id = auth.uid()
) with check (public.is_super_admin() or author_id = auth.uid());

create policy "promoter_links_select_scoped" on public.promoter_links for select using (
  active
  or public.is_super_admin()
  or promoter_id = auth.uid()
  or public.is_manager_for(promoter_id)
);
create policy "promoter_links_write_scoped" on public.promoter_links for all using (
  public.is_super_admin() or promoter_id = auth.uid() or public.is_manager_for(promoter_id)
) with check (public.is_super_admin() or promoter_id = auth.uid() or public.is_manager_for(promoter_id));

create policy "magic_links_select_scoped" on public.magic_links for select using (
  public.is_super_admin()
  or promoter_id = auth.uid()
  or public.is_manager_for(promoter_id)
  or (public.current_profile_role() = 'PROMOTER_MANAGER' and public.user_has_club(club_id))
);
create policy "magic_links_write_scoped" on public.magic_links for all using (
  public.is_super_admin()
  or promoter_id = auth.uid()
  or public.is_manager_for(promoter_id)
) with check (public.is_super_admin() or promoter_id = auth.uid() or public.is_manager_for(promoter_id));

create policy "events_select_active_or_assigned" on public.events for select using (
  active or public.is_super_admin() or public.user_has_club(club_id)
);
create policy "events_write_manager" on public.events for all using (
  public.is_super_admin() or (public.current_profile_role() = 'PROMOTER_MANAGER' and public.user_has_club(club_id))
) with check (public.is_super_admin() or (public.current_profile_role() = 'PROMOTER_MANAGER' and public.user_has_club(club_id)));

create policy "settings_select_staff" on public.platform_settings for select using (
  public.current_profile_role() in ('SUPER_ADMIN', 'PROMOTER_MANAGER')
);
create policy "settings_write_admin" on public.platform_settings for all using (public.is_super_admin()) with check (public.is_super_admin());

create policy "whatsapp_notifications_select_staff" on public.whatsapp_notifications for select using (
  public.is_super_admin()
  or exists (select 1 from public.requests r where r.id = request_id and (r.assigned_manager_id = auth.uid() or public.is_manager_for(r.promoter_id)))
);
create policy "whatsapp_notifications_admin_insert" on public.whatsapp_notifications for insert with check (public.is_super_admin());

create policy "audit_logs_select_admin_manager" on public.audit_logs for select using (
  public.is_super_admin()
  or (public.current_profile_role() = 'PROMOTER_MANAGER' and user_id in (select id from public.profiles where manager_id = auth.uid()))
);
create policy "audit_logs_insert_staff" on public.audit_logs for insert with check (
  public.current_profile_role() in ('SUPER_ADMIN', 'PROMOTER_MANAGER', 'PROMOTER') and user_id = auth.uid()
);
