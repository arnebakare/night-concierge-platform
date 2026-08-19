alter table public.clients
  add column if not exists client_code text;

update public.clients
set client_code = nullif(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), '')
where client_code is null
  and phone is not null;

create table if not exists public.client_aliases (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  source text not null default 'REQUEST',
  created_at timestamptz not null default now()
);

create unique index if not exists client_aliases_client_name_unique
  on public.client_aliases(client_id, name);

create temporary table if not exists client_phone_duplicates as
with ranked as (
  select
    id,
    client_code,
    first_value(id) over (partition by client_code order by updated_at desc nulls last, created_at asc, id asc) as keep_id,
    row_number() over (partition by client_code order by updated_at desc nulls last, created_at asc, id asc) as row_number
  from public.clients
  where client_code is not null
)
select id as duplicate_id, keep_id, client_code
from ranked
where row_number > 1;

insert into public.client_aliases (client_id, name, source, created_at)
select duplicates.keep_id, clients.name, 'PHONE_MERGE', now()
from client_phone_duplicates duplicates
join public.clients clients on clients.id = duplicates.duplicate_id
where clients.name is not null
on conflict (client_id, name) do nothing;

update public.requests requests
set client_id = duplicates.keep_id
from client_phone_duplicates duplicates
where requests.client_id = duplicates.duplicate_id;

update public.client_notes notes
set client_id = duplicates.keep_id
from client_phone_duplicates duplicates
where notes.client_id = duplicates.duplicate_id;

update public.magic_links links
set client_id = duplicates.keep_id
from client_phone_duplicates duplicates
where links.client_id = duplicates.duplicate_id;

do $$
begin
  if to_regclass('public.retention_outreach') is not null then
    update public.retention_outreach outreach
    set client_id = duplicates.keep_id
    from client_phone_duplicates duplicates
    where outreach.client_id = duplicates.duplicate_id;
  end if;

  if to_regclass('public.schedule_plans') is not null then
    update public.schedule_plans plans
    set client_id = duplicates.keep_id
    from client_phone_duplicates duplicates
    where plans.client_id = duplicates.duplicate_id;
  end if;
end $$;

delete from public.clients clients
using client_phone_duplicates duplicates
where clients.id = duplicates.duplicate_id;

update public.clients
set client_code = replace(id::text, '-', '')
where client_code is null;

alter table public.clients
  alter column client_code set not null;

create unique index if not exists clients_client_code_unique
  on public.clients(client_code);

alter table public.client_aliases enable row level security;

drop policy if exists "client_aliases_select_staff" on public.client_aliases;
create policy "client_aliases_select_staff" on public.client_aliases
for select using (
  public.current_profile_role() in ('SUPER_ADMIN', 'PROMOTER_MANAGER')
  or public.staff_can_access_client(client_id)
);

drop policy if exists "client_aliases_insert_staff" on public.client_aliases;
create policy "client_aliases_insert_staff" on public.client_aliases
for insert with check (
  public.current_profile_role() in ('SUPER_ADMIN', 'PROMOTER_MANAGER')
  or public.staff_can_access_client(client_id)
);

create or replace function public.set_client_code_from_phone()
returns trigger
language plpgsql
as $$
begin
  new.phone = regexp_replace(coalesce(new.phone, ''), '\s+', '', 'g');
  new.client_code = regexp_replace(new.phone, '\D', '', 'g');
  if new.client_code = '' then
    raise exception 'Client phone number is required';
  end if;
  return new;
end;
$$;

drop trigger if exists set_clients_client_code on public.clients;
create trigger set_clients_client_code
before insert or update of phone on public.clients
for each row execute function public.set_client_code_from_phone();

update public.clients
set phone = phone
where phone is not null;

create or replace function public.update_own_client_contact(p_name text, p_phone text, p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  cleaned_phone text;
  code text;
begin
  cleaned_phone := regexp_replace(coalesce(p_phone, ''), '\s+', '', 'g');
  code := regexp_replace(cleaned_phone, '\D', '', 'g');
  if code = '' then
    raise exception 'Client phone number is required';
  end if;

  update public.clients
  set
    name = p_name,
    phone = cleaned_phone,
    client_code = code,
    email = nullif(p_email, '')
  where profile_id = auth.uid();
end;
$$;

grant execute on function public.update_own_client_contact(text, text, text) to authenticated;
