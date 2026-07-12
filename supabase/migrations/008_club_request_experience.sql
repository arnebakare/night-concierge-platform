alter table public.clubs
  add column if not exists brand_config jsonb not null default '{}'::jsonb,
  add column if not exists service_config jsonb not null default '[]'::jsonb;

update public.clubs
set
  brand_config = jsonb_build_object(
    'monogram', 'LP',
    'tagline', 'Beachfront lunch, sunset, VIP hosting',
    'mood', 'Golden hour beach club'
  ),
  service_config = '[
    {"id":"beach-bed","label":"Beach bed","description":"Daytime sunbed or beach setup.","requestType":"VIP_SERVICE","icon":"Sun"},
    {"id":"lunch-table","label":"Lunch table","description":"Restaurant table for lunch or sunset.","requestType":"TABLE","icon":"Utensils"},
    {"id":"vip-table","label":"VIP table","description":"Premium table for a hosted group.","requestType":"TABLE","icon":"Crown"},
    {"id":"guestlist","label":"Guestlist","description":"Names for evening access.","requestType":"GUESTLIST","icon":"Users"},
    {"id":"celebration","label":"Celebration setup","description":"Birthday, hen group, or special moment.","requestType":"VIP_SERVICE","icon":"Sparkles"}
  ]'::jsonb
where slug = 'la-plage-casanis' and (service_config = '[]'::jsonb or brand_config = '{}'::jsonb);

update public.clubs
set
  brand_config = jsonb_build_object(
    'monogram', 'LJ',
    'tagline', 'Late-night after-party energy',
    'mood', 'After dark'
  ),
  service_config = '[
    {"id":"after-party","label":"After-party guestlist","description":"Guestlist for the late move.","requestType":"GUESTLIST","icon":"Music2"},
    {"id":"vip-table","label":"VIP table","description":"Late table with bottle service.","requestType":"TABLE","icon":"Crown"},
    {"id":"bottle-service","label":"Bottle service","description":"Bottle request for a group.","requestType":"VIP_SERVICE","icon":"GlassWater"},
    {"id":"group-entry","label":"Group entry","description":"Fast access for larger groups.","requestType":"GUESTLIST","icon":"Users"}
  ]'::jsonb
where slug = 'le-jade' and (service_config = '[]'::jsonb or brand_config = '{}'::jsonb);

update public.clubs
set
  brand_config = jsonb_build_object(
    'monogram', 'MZ',
    'tagline', 'Dinner show, tables, celebration groups',
    'mood', 'Show dinner'
  ),
  service_config = '[
    {"id":"dinner-show","label":"Dinner show","description":"Dinner reservation with show atmosphere.","requestType":"TABLE","icon":"Utensils"},
    {"id":"vip-dinner","label":"VIP dinner table","description":"Premium dinner table for a group.","requestType":"TABLE","icon":"Crown"},
    {"id":"late-table","label":"Late table","description":"Late-night table request.","requestType":"TABLE","icon":"Music2"},
    {"id":"celebration","label":"Celebration package","description":"Birthday, hen group, or special occasion.","requestType":"VIP_SERVICE","icon":"Sparkles"}
  ]'::jsonb
where slug = 'mamzel' and (service_config = '[]'::jsonb or brand_config = '{}'::jsonb);
