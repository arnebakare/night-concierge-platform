alter table public.concierge_packages
  add column if not exists spend_level text not null default 'ANY'
    check (spend_level in ('ANY', 'NORMAL', 'HIGH')),
  add column if not exists ideal_group_min integer
    check (ideal_group_min is null or ideal_group_min >= 1),
  add column if not exists ideal_group_max integer
    check (ideal_group_max is null or ideal_group_max >= 1),
  add column if not exists ideal_days_min integer
    check (ideal_days_min is null or ideal_days_min >= 1),
  add column if not exists ideal_days_max integer
    check (ideal_days_max is null or ideal_days_max >= 1),
  add column if not exists recommendation_weight integer not null default 1
    check (recommendation_weight between 0 and 20),
  add column if not exists recommendation_note text;

create index if not exists idx_concierge_packages_recommendation
  on public.concierge_packages(active, request_type, spend_level, recommendation_weight desc);

update public.concierge_packages
set
  spend_level = 'HIGH',
  ideal_group_min = 4,
  ideal_days_min = 2,
  recommendation_weight = 8,
  recommendation_note = 'Best for party-focused groups that want multiple venues and a hosted Marbella plan.'
where slug in ('girls-weekend', 'full-marbella-weekend');

update public.concierge_packages
set
  spend_level = 'ANY',
  ideal_group_min = 2,
  ideal_days_min = 1,
  recommendation_weight = 6,
  recommendation_note = 'Good when the request includes golf, dinner, or a softer daytime plan.'
where slug = 'golf-dinner';

update public.concierge_packages
set
  spend_level = 'NORMAL',
  ideal_group_min = 2,
  ideal_days_min = 1,
  ideal_days_max = 2,
  recommendation_weight = 5,
  recommendation_note = 'Good entry package for simple daytime hospitality with optional evening follow-up.'
where slug = 'beach-club-day';
