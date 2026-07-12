alter table public.clients add column if not exists profile_id uuid unique references public.profiles(id) on delete set null;
create index if not exists idx_clients_profile_id on public.clients(profile_id);

update public.clients set profile_id = '00000000-0000-0000-0000-000000000004'
where id = '20000000-0000-0000-0000-000000000001' and profile_id is null;

drop policy if exists "clients_select_scoped" on public.clients;
create policy "clients_select_scoped" on public.clients for select using (
  public.is_super_admin()
  or profile_id = auth.uid()
  or created_by_user_id = auth.uid()
  or exists (select 1 from public.requests r where r.client_id = id and (r.promoter_id = auth.uid() or r.assigned_manager_id = auth.uid() or public.is_manager_for(r.promoter_id)))
  or exists (select 1 from public.requests r where r.client_id = id and public.user_has_club(r.club_id) and public.current_profile_role() = 'PROMOTER_MANAGER')
);

drop policy if exists "requests_select_scoped" on public.requests;
create policy "requests_select_scoped" on public.requests for select using (
  public.is_super_admin()
  or promoter_id = auth.uid()
  or assigned_manager_id = auth.uid()
  or public.is_manager_for(promoter_id)
  or (public.current_profile_role() = 'PROMOTER_MANAGER' and public.user_has_club(club_id))
  or exists (select 1 from public.clients c where c.id = client_id and c.profile_id = auth.uid() and public.current_profile_role() = 'CLIENT')
);

create or replace function public.claim_client_profile()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare claimed_id uuid;
begin
  if public.current_profile_role() <> 'CLIENT' then return null; end if;
  update public.clients c
  set profile_id = auth.uid()
  from public.profiles p
  where p.id = auth.uid() and c.profile_id is null and lower(c.email) = lower(p.email)
  returning c.id into claimed_id;
  return claimed_id;
end;
$$;

create or replace function public.update_own_client_contact(p_name text, p_phone text, p_email text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if public.current_profile_role() <> 'CLIENT' then raise exception 'not allowed'; end if;
  update public.clients set name = p_name, phone = p_phone, email = nullif(p_email, '') where profile_id = auth.uid();
end;
$$;

create or replace function public.cancel_own_request(p_request_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare changed boolean;
begin
  if public.current_profile_role() <> 'CLIENT' then raise exception 'not allowed'; end if;
  update public.requests r set status = 'CANCELLED'
  where r.id = p_request_id and r.status in ('NEW','CONTACTED','PENDING','CONFIRMED')
    and exists (select 1 from public.clients c where c.id = r.client_id and c.profile_id = auth.uid());
  changed := found;
  if changed then insert into public.audit_logs(user_id, action, entity_type, entity_id, metadata) values (auth.uid(), 'CLIENT_REQUEST_CANCELLED', 'requests', p_request_id, '{}'::jsonb); end if;
  return changed;
end;
$$;

grant execute on function public.claim_client_profile() to authenticated;
grant execute on function public.update_own_client_contact(text, text, text) to authenticated;
grant execute on function public.cancel_own_request(uuid) to authenticated;

create policy "notifications_update_staff" on public.whatsapp_notifications for update using (
  public.is_super_admin()
  or exists (select 1 from public.requests r where r.id = request_id and (r.assigned_manager_id = auth.uid() or public.is_manager_for(r.promoter_id)))
) with check (
  public.is_super_admin()
  or exists (select 1 from public.requests r where r.id = request_id and (r.assigned_manager_id = auth.uid() or public.is_manager_for(r.promoter_id)))
);
