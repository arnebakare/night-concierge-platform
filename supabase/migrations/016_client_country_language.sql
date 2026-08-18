alter table public.clients
  add column if not exists country text,
  add column if not exists preferred_language text default 'en';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'clients_preferred_language_check'
      and conrelid = 'public.clients'::regclass
  ) then
    alter table public.clients
      add constraint clients_preferred_language_check
      check (preferred_language in ('en', 'es', 'sv'))
      not valid;
  end if;
end $$;

alter table public.clients validate constraint clients_preferred_language_check;

create index if not exists clients_country_idx on public.clients (country);

update public.clients
set preferred_language = 'en'
where preferred_language is null;
