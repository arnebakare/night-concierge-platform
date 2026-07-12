-- Narrow operational permissions required by the manager dashboard.
create policy "profiles_manager_update_team" on public.profiles
for update
using (
  public.current_profile_role() = 'PROMOTER_MANAGER'
  and role = 'PROMOTER'
  and manager_id = auth.uid()
)
with check (
  role = 'PROMOTER'
  and manager_id = auth.uid()
);

create policy "settings_manager_whatsapp_insert" on public.platform_settings
for insert
with check (
  public.current_profile_role() = 'PROMOTER_MANAGER'
  and key = 'whatsapp_destination_number'
);

create policy "settings_manager_whatsapp_update" on public.platform_settings
for update
using (
  public.current_profile_role() = 'PROMOTER_MANAGER'
  and key = 'whatsapp_destination_number'
)
with check (key = 'whatsapp_destination_number');
