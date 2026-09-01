create table if not exists public.client_follow_up_tasks (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  assigned_to uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  title text not null,
  due_date date,
  priority text not null default 'NORMAL' check (priority in ('LOW', 'NORMAL', 'HIGH')),
  status text not null default 'OPEN' check (status in ('OPEN', 'DONE', 'CANCELLED')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_client_follow_up_tasks_client
  on public.client_follow_up_tasks(client_id, status, due_date);

create index if not exists idx_client_follow_up_tasks_assigned
  on public.client_follow_up_tasks(assigned_to, status, due_date);

drop trigger if exists set_client_follow_up_tasks_updated_at on public.client_follow_up_tasks;
create trigger set_client_follow_up_tasks_updated_at
before update on public.client_follow_up_tasks
for each row execute function public.set_updated_at();

alter table public.client_follow_up_tasks enable row level security;

drop policy if exists "client_follow_up_tasks_select_staff" on public.client_follow_up_tasks;
create policy "client_follow_up_tasks_select_staff" on public.client_follow_up_tasks
for select using (
  public.current_profile_role() in ('SUPER_ADMIN', 'PROMOTER_MANAGER', 'PROMOTER')
);

drop policy if exists "client_follow_up_tasks_write_staff" on public.client_follow_up_tasks;
create policy "client_follow_up_tasks_write_staff" on public.client_follow_up_tasks
for all using (
  public.current_profile_role() in ('SUPER_ADMIN', 'PROMOTER_MANAGER', 'PROMOTER')
) with check (
  public.current_profile_role() in ('SUPER_ADMIN', 'PROMOTER_MANAGER', 'PROMOTER')
);
