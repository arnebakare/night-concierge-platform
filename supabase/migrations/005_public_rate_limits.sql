create table if not exists public.public_request_rate_limits (
  fingerprint text primary key,
  window_started_at timestamptz not null default now(),
  attempts integer not null default 1,
  updated_at timestamptz not null default now()
);

alter table public.public_request_rate_limits enable row level security;

create or replace function public.consume_public_request_slot(
  p_fingerprint text,
  p_limit integer default 5,
  p_window_minutes integer default 10
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare current_attempts integer;
begin
  insert into public.public_request_rate_limits(fingerprint, window_started_at, attempts, updated_at)
  values (p_fingerprint, now(), 1, now())
  on conflict (fingerprint) do update set
    attempts = case
      when public.public_request_rate_limits.window_started_at < now() - make_interval(mins => p_window_minutes) then 1
      else public.public_request_rate_limits.attempts + 1
    end,
    window_started_at = case
      when public.public_request_rate_limits.window_started_at < now() - make_interval(mins => p_window_minutes) then now()
      else public.public_request_rate_limits.window_started_at
    end,
    updated_at = now()
  returning attempts into current_attempts;
  return current_attempts <= p_limit;
end;
$$;

revoke all on function public.consume_public_request_slot(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_public_request_slot(text, integer, integer) to service_role;

create index if not exists idx_rate_limits_updated on public.public_request_rate_limits(updated_at);
