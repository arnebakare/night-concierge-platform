-- Break circular RLS policy expansion by evaluating relationship checks in
-- security-definer helpers with row security disabled for the helper query.

create or replace function public.current_profile_role()
returns public.profile_role
language sql
security definer
stable
set search_path = public
set row_security = off
as $$
  select role from public.profiles where id = auth.uid() and active = true;
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
security definer
stable
set search_path = public
set row_security = off
as $$
  select coalesce(public.current_profile_role() = 'SUPER_ADMIN', false);
$$;

create or replace function public.is_manager_for(promoter uuid)
returns boolean
language sql
security definer
stable
set search_path = public
set row_security = off
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
set search_path = public
set row_security = off
as $$
  select exists (
    select 1 from public.club_users
    where club_id = club and user_id = auth.uid()
  );
$$;

create or replace function public.shares_club_with_user(target_user uuid)
returns boolean
language sql
security definer
stable
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
    from public.club_users mine
    join public.club_users theirs on theirs.club_id = mine.club_id
    where mine.user_id = auth.uid() and theirs.user_id = target_user
  );
$$;

create or replace function public.staff_can_access_client(target_client uuid)
returns boolean
language sql
security definer
stable
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
    from public.requests r
    where r.client_id = target_client
      and (
        r.promoter_id = auth.uid()
        or r.assigned_manager_id = auth.uid()
        or public.is_manager_for(r.promoter_id)
        or (
          public.current_profile_role() = 'PROMOTER_MANAGER'
          and public.user_has_club(r.club_id)
        )
      )
  );
$$;

create or replace function public.client_owns_request_client(target_client uuid)
returns boolean
language sql
security definer
stable
set search_path = public
set row_security = off
as $$
  select exists (
    select 1 from public.clients
    where id = target_client and profile_id = auth.uid()
  );
$$;

drop policy if exists "profiles_select_scoped" on public.profiles;
create policy "profiles_select_scoped" on public.profiles for select using (
  public.is_super_admin()
  or id = auth.uid()
  or manager_id = auth.uid()
  or (
    public.current_profile_role() = 'PROMOTER_MANAGER'
    and public.shares_club_with_user(id)
  )
);

drop policy if exists "clients_select_scoped" on public.clients;
create policy "clients_select_scoped" on public.clients for select using (
  public.is_super_admin()
  or profile_id = auth.uid()
  or created_by_user_id = auth.uid()
  or public.staff_can_access_client(id)
);

drop policy if exists "requests_select_scoped" on public.requests;
create policy "requests_select_scoped" on public.requests for select using (
  public.is_super_admin()
  or promoter_id = auth.uid()
  or assigned_manager_id = auth.uid()
  or public.is_manager_for(promoter_id)
  or (
    public.current_profile_role() = 'PROMOTER_MANAGER'
    and public.user_has_club(club_id)
  )
  or (
    public.current_profile_role() = 'CLIENT'
    and public.client_owns_request_client(client_id)
  )
);

revoke all on function public.shares_club_with_user(uuid) from public;
revoke all on function public.staff_can_access_client(uuid) from public;
revoke all on function public.client_owns_request_client(uuid) from public;
grant execute on function public.shares_club_with_user(uuid) to authenticated;
grant execute on function public.staff_can_access_client(uuid) to authenticated;
grant execute on function public.client_owns_request_client(uuid) to authenticated;
