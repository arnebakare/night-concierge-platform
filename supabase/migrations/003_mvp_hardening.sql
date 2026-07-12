-- Query paths used by inboxes, reports, notification operations, and audits.
create index if not exists idx_requests_club_date on public.requests(club_id, requested_date);
create index if not exists idx_requests_created_at on public.requests(created_at desc);
create index if not exists idx_clients_updated_at on public.clients(updated_at desc);
create index if not exists idx_events_date_active on public.events(event_date, active);
create index if not exists idx_magic_links_promoter_created on public.magic_links(promoter_id, created_at desc);
create index if not exists idx_notifications_status_created on public.whatsapp_notifications(status, created_at desc);
create index if not exists idx_audit_created_at on public.audit_logs(created_at desc);

alter table public.requests add constraint requests_guest_count_reasonable check (guest_count between 1 and 200) not valid;
alter table public.client_notes add constraint client_notes_club_visibility check (visibility <> 'CLUB_ONLY' or club_id is not null) not valid;

alter table public.requests validate constraint requests_guest_count_reasonable;
alter table public.client_notes validate constraint client_notes_club_visibility;
