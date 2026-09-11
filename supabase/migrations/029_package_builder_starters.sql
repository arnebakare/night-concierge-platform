insert into public.concierge_packages (title, slug, description, request_type, price_hint, package_items, active)
values
  (
    'Girls Weekend',
    'girls-weekend',
    'A polished Marbella weekend with beach club, dinner, nightlife, and easy movement between venues.',
    'PACKAGE',
    'Tailored by dates, group size, and spend',
    '["Beach club day", "Dinner reservation", "Nightclub table or guestlist", "Private transfers", "Birthday or celebration options"]'::jsonb,
    true
  ),
  (
    'Golf + Dinner',
    'golf-dinner',
    'Golf day with tee-time options, transport, and a dinner table afterwards.',
    'GOLF',
    'Quoted by course, tee time, and group size',
    '["Golf course options", "Tee time request", "Buggy and clubs if needed", "Return transfer", "Dinner table after golf"]'::jsonb,
    true
  ),
  (
    'Beach Club Day',
    'beach-club-day',
    'Daytime beach club setup with beds or table, drinks preferences, and optional dinner or night follow-up.',
    'VIP_SERVICE',
    'Minimum spend confirmed before booking',
    '["Beach club options", "Sunbeds or table", "Arrival time", "Drinks preferences", "Optional dinner or club afterwards"]'::jsonb,
    true
  ),
  (
    'Full Marbella Weekend',
    'full-marbella-weekend',
    'Full-stay planning across beach clubs, restaurants, DJs, nightlife, transfers, and optional villa or yacht add-ons.',
    'SCHEDULE',
    'Built around travel dates and customer style',
    '["Daily itinerary", "Beach clubs", "Restaurants", "Nightlife and DJ nights", "Transfers", "Optional yacht, villa, or golf add-ons"]'::jsonb,
    true
  )
on conflict (slug) do update set
  title = excluded.title,
  description = excluded.description,
  request_type = excluded.request_type,
  price_hint = excluded.price_hint,
  package_items = excluded.package_items,
  active = true,
  updated_at = now();
