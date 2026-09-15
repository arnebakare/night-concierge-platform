-- Unified first-party Meta messaging for WhatsApp Cloud API and Instagram.
-- The service-role webhook is the only writer for inbound provider events.

create type public.messaging_channel as enum ('WHATSAPP', 'INSTAGRAM');
create type public.conversation_status as enum ('OPEN', 'PENDING', 'RESOLVED');
create type public.message_direction as enum ('INBOUND', 'OUTBOUND');
create type public.message_delivery_status as enum ('RECEIVED', 'PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED');

alter table public.clients
  add column if not exists owner_promoter_id uuid references public.profiles(id) on delete set null;

update public.clients c
set owner_promoter_id = c.created_by_user_id
from public.profiles p
where c.owner_promoter_id is null
  and p.id = c.created_by_user_id
  and p.role = 'PROMOTER';

create table public.customer_identities (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  channel public.messaging_channel not null,
  external_user_id text not null,
  username text,
  display_name text,
  phone text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (channel, external_user_id)
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  customer_identity_id uuid not null references public.customer_identities(id) on delete cascade,
  channel public.messaging_channel not null,
  external_account_id text not null,
  external_thread_id text,
  assigned_promoter_id uuid references public.profiles(id) on delete set null,
  assigned_manager_id uuid references public.profiles(id) on delete set null,
  status public.conversation_status not null default 'OPEN',
  unread_count integer not null default 0 check (unread_count >= 0),
  last_message_at timestamptz,
  last_message_preview text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (customer_identity_id, external_account_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  direction public.message_direction not null,
  sender_external_id text,
  sender_profile_id uuid references public.profiles(id) on delete set null,
  external_message_id text unique,
  message_type text not null default 'TEXT',
  body text,
  provider_payload jsonb not null default '{}'::jsonb,
  delivery_status public.message_delivery_status not null,
  error_message text,
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  check (body is not null or message_type <> 'TEXT')
);

create table public.message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  attachment_type text not null,
  external_media_id text,
  source_url text,
  storage_path text,
  mime_type text,
  filename text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.conversation_assignments (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  promoter_id uuid references public.profiles(id) on delete set null,
  manager_id uuid references public.profiles(id) on delete set null,
  assigned_by uuid references public.profiles(id) on delete set null,
  reason text,
  created_at timestamptz not null default now()
);

create table public.conversation_notes (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.requests add column if not exists conversation_id uuid references public.conversations(id) on delete set null;

alter table public.message_templates drop constraint if exists message_templates_channel_check;
alter table public.message_templates add constraint message_templates_channel_check
  check (channel in ('WHATSAPP', 'INSTAGRAM', 'EMAIL', 'INTERNAL'));

create index idx_customer_identities_client on public.customer_identities(client_id);
create index idx_conversations_assignment on public.conversations(assigned_promoter_id, status, last_message_at desc);
create index idx_conversations_manager on public.conversations(assigned_manager_id, status, last_message_at desc);
create index idx_conversations_unassigned on public.conversations(last_message_at desc) where assigned_promoter_id is null;
create index idx_messages_conversation_created on public.messages(conversation_id, created_at);
create index idx_message_attachments_message on public.message_attachments(message_id);
create index idx_conversation_assignments_conversation on public.conversation_assignments(conversation_id, created_at desc);
create index idx_conversation_notes_conversation on public.conversation_notes(conversation_id, created_at);
create index idx_clients_owner_promoter on public.clients(owner_promoter_id);
create index idx_requests_conversation on public.requests(conversation_id);

create trigger set_customer_identities_updated_at before update on public.customer_identities for each row execute function public.set_updated_at();
create trigger set_conversations_updated_at before update on public.conversations for each row execute function public.set_updated_at();
create trigger set_conversation_notes_updated_at before update on public.conversation_notes for each row execute function public.set_updated_at();

create or replace function public.staff_can_access_conversation(target_conversation uuid)
returns boolean
language sql
security definer
stable
set search_path = public
set row_security = off
as $$
  select exists (
    select 1 from public.conversations c
    where c.id = target_conversation and (
      public.is_super_admin()
      or c.assigned_promoter_id = auth.uid()
      or c.assigned_manager_id = auth.uid()
      or public.is_manager_for(c.assigned_promoter_id)
      or (
        public.current_profile_role() = 'PROMOTER_MANAGER'
        and c.assigned_promoter_id is null
      )
    )
  );
$$;

revoke all on function public.staff_can_access_conversation(uuid) from public;
grant execute on function public.staff_can_access_conversation(uuid) to authenticated;

alter table public.customer_identities enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.message_attachments enable row level security;
alter table public.conversation_assignments enable row level security;
alter table public.conversation_notes enable row level security;

create policy "customer_identities_select_staff" on public.customer_identities
for select using (
  public.is_super_admin() or exists (
    select 1 from public.conversations c
    where c.customer_identity_id = customer_identities.id
      and public.staff_can_access_conversation(c.id)
  )
);

create policy "conversations_select_staff" on public.conversations
for select using (public.staff_can_access_conversation(id));

create policy "messages_select_staff" on public.messages
for select using (public.staff_can_access_conversation(conversation_id));

create policy "messages_insert_staff" on public.messages
for insert with check (
  direction = 'OUTBOUND'
  and sender_profile_id = auth.uid()
  and public.staff_can_access_conversation(conversation_id)
);

create policy "messages_update_staff" on public.messages
for update using (
  direction = 'OUTBOUND'
  and sender_profile_id = auth.uid()
  and public.staff_can_access_conversation(conversation_id)
);

create policy "message_attachments_select_staff" on public.message_attachments
for select using (exists (
  select 1 from public.messages m
  where m.id = message_attachments.message_id
    and public.staff_can_access_conversation(m.conversation_id)
));

create policy "conversation_assignments_select_staff" on public.conversation_assignments
for select using (public.staff_can_access_conversation(conversation_id));

create policy "conversation_assignments_manage_managers" on public.conversation_assignments
for insert with check (
  assigned_by = auth.uid()
  and public.current_profile_role() in ('SUPER_ADMIN', 'PROMOTER_MANAGER')
  and public.staff_can_access_conversation(conversation_id)
);

create policy "conversation_notes_select_staff" on public.conversation_notes
for select using (public.staff_can_access_conversation(conversation_id));

create policy "conversation_notes_insert_staff" on public.conversation_notes
for insert with check (
  author_id = auth.uid()
  and public.staff_can_access_conversation(conversation_id)
);

create policy "conversation_notes_update_author" on public.conversation_notes
for update using (author_id = auth.uid()) with check (author_id = auth.uid());

create policy "conversation_notes_delete_author_or_admin" on public.conversation_notes
for delete using (author_id = auth.uid() or public.is_super_admin());

grant select on public.customer_identities, public.conversations, public.messages,
  public.message_attachments, public.conversation_assignments, public.conversation_notes to authenticated;
grant insert, update on public.messages to authenticated;
grant insert on public.conversation_assignments to authenticated;
grant insert, update, delete on public.conversation_notes to authenticated;

comment on table public.conversation_notes is 'Internal-only staff notes. Never transmitted to Meta.';

create or replace function public.set_conversation_status(p_conversation_id uuid, p_status public.conversation_status)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  if not public.staff_can_access_conversation(p_conversation_id) then
    raise exception 'Conversation is unavailable';
  end if;
  update public.conversations set status = p_status, unread_count = 0 where id = p_conversation_id;
end;
$$;

create or replace function public.assign_conversation(
  p_conversation_id uuid,
  p_promoter_id uuid,
  p_reason text default 'Assigned in concierge inbox'
)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  actor_role public.profile_role;
  target_manager uuid;
begin
  actor_role := public.current_profile_role();
  if actor_role not in ('SUPER_ADMIN', 'PROMOTER_MANAGER') or not public.staff_can_access_conversation(p_conversation_id) then
    raise exception 'Conversation assignment is unavailable';
  end if;
  if p_promoter_id is not null then
    select manager_id into target_manager from public.profiles where id = p_promoter_id and role = 'PROMOTER' and active = true;
    if not found then raise exception 'Promoter is unavailable'; end if;
    if actor_role = 'PROMOTER_MANAGER' and target_manager is distinct from auth.uid() then
      raise exception 'Promoter is outside your team';
    end if;
  elsif actor_role = 'PROMOTER_MANAGER' then
    target_manager := auth.uid();
  end if;
  update public.conversations set assigned_promoter_id = p_promoter_id, assigned_manager_id = target_manager where id = p_conversation_id;
  insert into public.conversation_assignments(conversation_id, promoter_id, manager_id, assigned_by, reason)
  values (p_conversation_id, p_promoter_id, target_manager, auth.uid(), p_reason);
end;
$$;

revoke all on function public.set_conversation_status(uuid, public.conversation_status) from public;
revoke all on function public.assign_conversation(uuid, uuid, text) from public;
grant execute on function public.set_conversation_status(uuid, public.conversation_status) to authenticated;
grant execute on function public.assign_conversation(uuid, uuid, text) to authenticated;
