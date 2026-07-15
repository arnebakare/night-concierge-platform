create table if not exists public.schedule_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  title text not null,
  city text not null default 'Marbella',
  date_from date not null,
  date_to date not null,
  spend_profile text not null default 'NORMAL' check (spend_profile in ('NORMAL', 'HIGH_SPEND')),
  prompt_text text,
  message text not null,
  plan jsonb not null default '{}'::jsonb,
  source text not null default 'APP' check (source in ('APP', 'WHATSAPP')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_schedule_plans_user_created
  on public.schedule_plans(user_id, created_at desc);

create index if not exists idx_schedule_plans_client_created
  on public.schedule_plans(client_id, created_at desc);

create trigger set_schedule_plans_updated_at
before update on public.schedule_plans
for each row execute function public.set_updated_at();

alter table public.schedule_plans enable row level security;

create policy "schedule_plans_select_staff" on public.schedule_plans
for select using (
  public.current_profile_role() in ('SUPER_ADMIN', 'PROMOTER_MANAGER', 'PROMOTER')
);

create policy "schedule_plans_insert_staff" on public.schedule_plans
for insert with check (
  public.current_profile_role() in ('SUPER_ADMIN', 'PROMOTER_MANAGER', 'PROMOTER')
  and (user_id = auth.uid() or public.is_super_admin())
);

create policy "schedule_plans_update_staff" on public.schedule_plans
for update using (
  public.is_super_admin()
  or user_id = auth.uid()
  or public.current_profile_role() = 'PROMOTER_MANAGER'
) with check (
  public.is_super_admin()
  or user_id = auth.uid()
  or public.current_profile_role() = 'PROMOTER_MANAGER'
);

alter table public.inbound_whatsapp_messages
  add column if not exists created_schedule_plan_id uuid references public.schedule_plans(id) on delete set null;

create index if not exists idx_inbound_whatsapp_schedule_plan
  on public.inbound_whatsapp_messages(created_schedule_plan_id);
