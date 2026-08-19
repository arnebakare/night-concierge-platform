insert into public.message_templates (key, label, channel, language, body)
values
  ('retention_checkin', 'Client care check-in', 'WHATSAPP', 'en', 'Hi {{client_first_name}}, hope you are well. If you are coming to Marbella again soon, message me here and I can help with tables, guestlist, or a good plan for the night.'),
  ('retention_checkin', 'Client care check-in', 'WHATSAPP', 'es', 'Hola {{client_first_name}}, espero que estés bien. Si vuelves pronto a Marbella, escríbeme por aquí y te ayudo con mesa, lista o un buen plan para la noche.'),
  ('retention_checkin', 'Client care check-in', 'WHATSAPP', 'sv', 'Hej {{client_first_name}}, hoppas allt är bra. Om du kommer till Marbella snart igen, skriv här så hjälper jag med bord, gästlista eller en bra plan för kvällen.')
on conflict (key, language) do update
set label = excluded.label,
    channel = excluded.channel,
    body = excluded.body,
    active = true,
    updated_at = now();
