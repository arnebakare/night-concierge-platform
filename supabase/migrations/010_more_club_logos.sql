update public.clubs
set image_url = '/venues/bon-bonniere-logo.png'
where slug = 'bon-bonniere'
  and coalesce(image_url, '') = '';

update public.clubs
set image_url = '/venues/momento-logo.png'
where slug = 'momento'
  and coalesce(image_url, '') = '';

update public.clubs
set image_url = '/venues/la-cabane-logo.png'
where slug = 'la-cabane'
  and coalesce(image_url, '') = '';

update public.clubs
set image_url = '/venues/motel-particulier-logo.png'
where slug = 'motel-particulier'
  and coalesce(image_url, '') = '';

update public.clubs
set image_url = '/venues/playa-padre-logo.png'
where slug = 'playa-padre'
  and coalesce(image_url, '') = '';
