insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@night.test', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Admin Noir","role":"SUPER_ADMIN"}', now(), now()),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'julia@casanis.es', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Julia Casanis","role":"PROMOTER_MANAGER"}', now(), now()),
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'julia2@casanis.es', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Julia","role":"PROMOTER"}', now(), now()),
  ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'client@night.test', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Daniel","role":"CLIENT"}', now(), now())
on conflict (id) do nothing;

update auth.users set
  encrypted_password = crypt('password123', gen_salt('bf')),
  email_confirmed_at = coalesce(email_confirmed_at, now()),
  raw_app_meta_data = '{"provider":"email","providers":["email"]}',
  confirmation_token = '',
  recovery_token = '',
  email_change_token_new = '',
  email_change = '',
  phone_change = '',
  phone_change_token = '',
  email_change_token_current = '',
  reauthentication_token = '',
  updated_at = now()
where id in (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000004'
);

insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id::text, u.id,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  'email', now(), now(), now()
from auth.users u
where u.id in (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000004'
)
and not exists (select 1 from auth.identities i where i.user_id = u.id and i.provider = 'email');

update public.profiles set role = 'SUPER_ADMIN', name = 'Admin Noir' where id = '00000000-0000-0000-0000-000000000001';
update auth.users set email = 'julia@casanis.es', raw_user_meta_data = '{"name":"Julia Casanis","role":"PROMOTER_MANAGER"}' where id = '00000000-0000-0000-0000-000000000002';
update auth.users set email = 'julia2@casanis.es', raw_user_meta_data = '{"name":"Julia","role":"PROMOTER"}' where id = '00000000-0000-0000-0000-000000000003';

update public.profiles set role = 'PROMOTER_MANAGER', name = 'Julia Casanis', email = 'julia@casanis.es' where id = '00000000-0000-0000-0000-000000000002';
update public.profiles set role = 'PROMOTER', name = 'Julia', email = 'julia2@casanis.es', manager_id = '00000000-0000-0000-0000-000000000002' where id = '00000000-0000-0000-0000-000000000003';
update public.profiles set role = 'CLIENT', name = 'Daniel' where id = '00000000-0000-0000-0000-000000000004';

insert into public.clubs (id, name, slug, city, address, description, active)
values
  ('10000000-0000-0000-0000-000000000001', 'La Plage Casanis', 'la-plage-casanis', 'Marbella', null, 'Beachfront Casanis hospitality for VIP requests and table service.', true),
  ('10000000-0000-0000-0000-000000000002', 'Le Jade', 'le-jade', 'Marbella', null, 'Marbella nightlife venue for guestlist and VIP service.', true),
  ('10000000-0000-0000-0000-000000000003', 'Mamzel', 'mamzel', 'Marbella', null, 'High-energy dinner and nightlife destination for private groups.', true)
on conflict (id) do nothing;

update public.clubs set name = 'La Plage Casanis', slug = 'la-plage-casanis', city = 'Marbella', address = null, description = 'Beachfront Casanis hospitality for VIP requests and table service.' where id = '10000000-0000-0000-0000-000000000001';
update public.clubs set name = 'Le Jade', slug = 'le-jade', city = 'Marbella', address = null, description = 'Marbella nightlife venue for guestlist and VIP service.' where id = '10000000-0000-0000-0000-000000000002';
update public.clubs set name = 'Mamzel', slug = 'mamzel', city = 'Marbella', address = null, description = 'High-energy dinner and nightlife destination for private groups.' where id = '10000000-0000-0000-0000-000000000003';
update public.clubs set active = false where id = '10000000-0000-0000-0000-000000000004' or slug = 'all-in-marbella';

insert into public.club_users (club_id, user_id, role_at_club)
values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'manager'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'promoter'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'manager'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'promoter'),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'manager'),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', 'promoter')
on conflict (club_id, user_id) do nothing;

insert into public.clients (id, name, phone, email, instagram, vip_level, status, created_by_user_id, profile_id)
values
  ('20000000-0000-0000-0000-000000000001', 'Daniel', '+34611222333', 'daniel@example.com', '@daniel', 'GOLD', 'NORMAL', '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000004'),
  ('20000000-0000-0000-0000-000000000002', 'Olivia', '+34622333444', null, '@olivia', 'SILVER', 'NORMAL', '00000000-0000-0000-0000-000000000003', null)
on conflict (id) do nothing;

update public.clients set name = 'Daniel', email = 'daniel@example.com', instagram = '@daniel', profile_id = '00000000-0000-0000-0000-000000000004' where id = '20000000-0000-0000-0000-000000000001';
update public.clients set name = 'Olivia', email = null, instagram = '@olivia' where id = '20000000-0000-0000-0000-000000000002';

insert into public.requests (id, client_id, club_id, promoter_id, assigned_manager_id, source, request_type, status, requested_date, arrival_time, guest_count, budget, message)
values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'PROMOTER_LINK', 'TABLE', 'NEW', current_date, '01:00', 6, '1500', 'Birthday table, premium vodka.'),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'MANUAL_ENTRY', 'GUESTLIST', 'PENDING', current_date, '00:30', 4, null, 'Needs confirmation before midnight.')
on conflict (id) do nothing;

insert into public.client_notes (client_id, club_id, request_id, author_id, visibility, note_type, content)
values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'GLOBAL', 'PREFERENCE', 'Prefers table near DJ booth and sparkling water on arrival.'),
  ('20000000-0000-0000-0000-000000000001', null, null, '00000000-0000-0000-0000-000000000002', 'MANAGER_ONLY', 'WARNING', 'Requires manager approval for very large groups.')
on conflict do nothing;

insert into public.promoter_links (promoter_id, club_id, slug, title)
values
  ('00000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'julia-la-plage-casanis', 'La Plage Casanis VIP Requests'),
  ('00000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 'julia-le-jade', 'Le Jade Guestlist'),
  ('00000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', 'julia-mamzel', 'Mamzel Tables')
on conflict (slug) do nothing;

update public.promoter_links set slug = 'julia-la-plage-casanis', title = 'La Plage Casanis VIP Requests' where promoter_id = '00000000-0000-0000-0000-000000000003' and club_id = '10000000-0000-0000-0000-000000000001';
update public.promoter_links set slug = 'julia-le-jade', title = 'Le Jade Guestlist' where promoter_id = '00000000-0000-0000-0000-000000000003' and club_id = '10000000-0000-0000-0000-000000000002';
update public.promoter_links set slug = 'julia-mamzel', title = 'Mamzel Tables' where promoter_id = '00000000-0000-0000-0000-000000000003' and club_id = '10000000-0000-0000-0000-000000000003';
delete from public.promoter_links where slug = 'julia-all-in-marbella';

insert into public.events (club_id, name, slug, event_date, description)
values
  ('10000000-0000-0000-0000-000000000001', 'La Plage Weekend', 'la-plage-weekend', current_date + 2, 'VIP-focused La Plage weekend requests.'),
  ('10000000-0000-0000-0000-000000000002', 'Le Jade Night', 'le-jade-night', current_date + 3, 'Le Jade guestlist and table requests.')
on conflict (club_id, slug) do nothing;

insert into public.magic_links (token, client_id, promoter_id, club_id, expires_at, max_uses)
values ('magic-demo-token', '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', now() + interval '14 days', 5)
on conflict (token) do nothing;

insert into public.platform_settings (key, value)
values ('whatsapp_destination_number', 'whatsapp:+34000000000')
on conflict (key) do update set value = excluded.value;
