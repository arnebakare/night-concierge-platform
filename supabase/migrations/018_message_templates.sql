create table if not exists public.message_templates (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  label text not null,
  channel text not null default 'WHATSAPP' check (channel in ('WHATSAPP', 'EMAIL', 'INTERNAL')),
  language text not null default 'en' check (language in ('en', 'es', 'sv')),
  body text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (key, language)
);

alter table public.message_templates enable row level security;

drop policy if exists "message_templates_select_staff" on public.message_templates;
create policy "message_templates_select_staff" on public.message_templates
for select using (public.current_profile_role() in ('SUPER_ADMIN', 'PROMOTER_MANAGER', 'PROMOTER'));

drop policy if exists "message_templates_manage_managers" on public.message_templates;
create policy "message_templates_manage_managers" on public.message_templates
for all using (public.current_profile_role() in ('SUPER_ADMIN', 'PROMOTER_MANAGER'))
with check (public.current_profile_role() in ('SUPER_ADMIN', 'PROMOTER_MANAGER'));

drop trigger if exists set_message_templates_updated_at on public.message_templates;
create trigger set_message_templates_updated_at
before update on public.message_templates
for each row execute function public.set_updated_at();

insert into public.message_templates (key, label, channel, language, body)
values
  ('client_reply', 'Reply to client', 'WHATSAPP', 'en', 'Hi {{client_first_name}}, perfect. I’ll check with {{venue_name}} for {{date}} for {{guest_count}} guests and get back to you shortly. If you prefer a specific time or area, just send it here.'),
  ('client_reply', 'Reply to client', 'WHATSAPP', 'es', 'Hola {{client_first_name}}, perfecto. Lo miro con {{venue_name}} para {{date}} para {{guest_count}} personas y te digo enseguida. Si prefieres una hora o zona concreta, mándamelo por aquí.'),
  ('client_reply', 'Reply to client', 'WHATSAPP', 'sv', 'Hej {{client_first_name}}, absolut. Jag kollar med {{venue_name}} {{date}} för {{guest_count}} personer och återkommer snart. Om du vill ha en särskild tid eller plats, skriv det här.'),
  ('venue_check', 'Ask venue', 'WHATSAPP', 'en', 'Can you check this for me?\n\n{{venue_name}} · {{request_type}}\nDate: {{date}}{{arrival_line}}\nClient: {{client_name}}\nGuests: {{guest_count}}{{budget_line}}{{notes_line}}\n\nIf that is not possible, what is the closest good option?'),
  ('client_offer', 'Offer to client', 'WHATSAPP', 'en', 'Hi {{client_first_name}}, I checked {{venue_name}} for {{date}}.\n\nThey can do {{service_label}} for {{guest_count}} guests{{arrival_offer_line}}{{spend_offer_line}}.\n\nWould you like me to try to hold it for you?')
on conflict (key, language) do update
set label = excluded.label,
    channel = excluded.channel,
    body = excluded.body,
    active = true,
    updated_at = now();
