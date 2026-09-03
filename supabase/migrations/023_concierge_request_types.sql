alter type public.request_type add value if not exists 'BOAT';
alter type public.request_type add value if not exists 'GOLF';
alter type public.request_type add value if not exists 'VILLA';
alter type public.request_type add value if not exists 'TRANSFER';
alter type public.request_type add value if not exists 'SCHEDULE';
alter type public.request_type add value if not exists 'PACKAGE';

alter table public.clubs
  add column if not exists venue_kind text not null default 'VENUE';
