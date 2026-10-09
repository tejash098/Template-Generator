-- Google Calendar, per member: a member connects their own Google account and
-- adds bookings to a "Shri Ram Bus Service" calendar the app creates there.
--
-- * google_connections       one row per connected member (no secrets here)
-- * booking_calendar_events  one row per (booking, member) event
-- * refresh tokens           Supabase Vault, secret name 'google_refresh:<user_id>'
-- * edits / deletes          AFTER UPDATE trigger on bookings → pg_net →
--                            Edge Function google-calendar-hook
--
-- Clients may only read their own rows; every write goes through the
-- google-calendar / google-calendar-hook Edge Functions (service role).

create extension if not exists pg_net;

create table public.google_connections (
  user_id uuid primary key references auth.users (id) on delete cascade,
  google_sub text not null,
  account_email text not null default '',
  calendar_id text,
  status text not null default 'connected' check (status in ('connected', 'needs_reauth')),
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.booking_calendar_events (
  booking_id uuid not null references public.bookings (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  google_event_id text,
  html_link text,
  content_hash text,
  status text not null default 'added' check (status in ('added', 'error')),
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (booking_id, user_id)
);
create index booking_calendar_events_user on public.booking_calendar_events (user_id);
create index booking_calendar_events_org on public.booking_calendar_events (organization_id);

alter table public.google_connections enable row level security;
alter table public.booking_calendar_events enable row level security;

create policy "users read own google connection" on public.google_connections
  for select to authenticated using (user_id = (select auth.uid()));
create policy "users read own calendar events" on public.booking_calendar_events
  for select to authenticated using (user_id = (select auth.uid()));

create trigger google_connections_set_updated_at before update on public.google_connections
  for each row execute function public.set_updated_at();
create trigger booking_calendar_events_set_updated_at before update on public.booking_calendar_events
  for each row execute function public.set_updated_at();

-- Icons on the bookings page follow hook-side changes (e.g. an error) live.
alter publication supabase_realtime add table public.booking_calendar_events;

-- ── Vault helpers (service role only) ───────────────────────────────────────

-- Stores (or replaces) a member's Google refresh token.
create or replace function public.calendar_token_put(p_user_id uuid, p_token text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  secret_name text := 'google_refresh:' || p_user_id::text;
  existing uuid;
begin
  select id into existing from vault.secrets where name = secret_name;
  if existing is null then
    perform vault.create_secret(p_token, secret_name, 'Google Calendar refresh token');
  else
    perform vault.update_secret(existing, p_token);
  end if;
end $$;

create or replace function public.calendar_token_get(p_user_id uuid)
returns text language sql stable security definer set search_path = '' as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'google_refresh:' || p_user_id::text;
$$;

create or replace function public.calendar_token_drop(p_user_id uuid)
returns void language sql security definer set search_path = '' as $$
  delete from vault.secrets where name = 'google_refresh:' || p_user_id::text;
$$;

-- Shared secret between the bookings trigger and google-calendar-hook. Generated
-- here, inside the database, so it never appears in the repository.
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'calendar_hook_secret') then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'calendar_hook_secret',
      'bookings trigger → google-calendar-hook'
    );
  end if;
end $$;

create or replace function public.calendar_hook_secret()
returns text language sql stable security definer set search_path = '' as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'calendar_hook_secret';
$$;

-- ── Edits and deletes reach Google ──────────────────────────────────────────

-- Fires after the LWW guard, so a dropped (stale) push never calls the hook.
-- pg_net sends the request after the transaction commits.
create or replace function public.bookings_calendar_hook()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.booking_calendar_events e where e.booking_id = new.id) then
    perform net.http_post(
      url := 'https://cfxzvmtowcsevtnmyqeg.supabase.co/functions/v1/google-calendar-hook',
      body := jsonb_build_object('bookingId', new.id),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-hook-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'calendar_hook_secret')
      ),
      timeout_milliseconds := 30000
    );
  end if;
  return null;
end $$;

-- Only the columns that end up in the event (share paths, sync bookkeeping and
-- the page setup do not).
create trigger bookings_c_calendar after update on public.bookings
  for each row
  when (
    old.booking_no is distinct from new.booking_no
    or old.name is distinct from new.name
    or old.village is distinct from new.village
    or old.post is distinct from new.post
    or old.thana is distinct from new.thana
    or old.from_place is distinct from new.from_place
    or old.to_place is distinct from new.to_place
    or old.travel_date is distinct from new.travel_date
    or old.departure_time is distinct from new.departure_time
    or old.return_date is distinct from new.return_date
    or old.return_time is distinct from new.return_time
    or old.fare is distinct from new.fare
    or old.advance is distinct from new.advance
    or old.mobile is distinct from new.mobile
    or old.mobile2 is distinct from new.mobile2
    or old.bus is distinct from new.bus
    or old.issued_by_name is distinct from new.issued_by_name
    or old.deleted_at is distinct from new.deleted_at
  )
  execute function public.bookings_calendar_hook();

-- ── Privileges ──────────────────────────────────────────────────────────────

revoke execute on function public.calendar_token_put(uuid, text) from public, anon, authenticated;
revoke execute on function public.calendar_token_get(uuid) from public, anon, authenticated;
revoke execute on function public.calendar_token_drop(uuid) from public, anon, authenticated;
revoke execute on function public.calendar_hook_secret() from public, anon, authenticated;
revoke execute on function public.bookings_calendar_hook() from public, anon, authenticated;

grant execute on function
  public.calendar_token_put(uuid, text),
  public.calendar_token_get(uuid),
  public.calendar_token_drop(uuid),
  public.calendar_hook_secret()
to service_role;
