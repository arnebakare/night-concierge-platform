update public.clubs
set image_url = '/venues/la-plage-casanis-logo.png'
where slug = 'la-plage-casanis'
  and coalesce(image_url, '') = '';

update public.clubs
set image_url = '/venues/le-jade-logo.png'
where slug = 'le-jade'
  and coalesce(image_url, '') = '';

update public.clubs
set image_url = '/venues/mamzel-logo.png'
where slug = 'mamzel'
  and coalesce(image_url, '') = '';
