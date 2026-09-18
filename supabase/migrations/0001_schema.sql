-- Core schema: one organization (Shri Ram Bus Service) with members, their
-- devices, the booking-number sequence, and the bookings themselves.
-- Applied with the Supabase MCP `apply_migration` and kept here for the record.

create type public.membership_role as enum ('owner', 'staff');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- One row per auth user; created by the auth.users trigger below.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default now()
);

create table public.memberships (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.membership_role not null default 'staff',
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  primary key (organization_id, user_id)
);
create index memberships_user on public.memberships (user_id);

-- A device = one app installation. `code` (A, B, C...) prefixes provisional
-- booking numbers issued while a device is offline without a reserved block.
create table public.devices (
  id uuid primary key,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  code text not null,
  name text not null default '',
  last_seen_at timestamptz not null default now(),
  unique (organization_id, code)
);

-- The organization's single running पत्रांक sequence.
create table public.organization_counters (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  next_seq int not null default 1
);

-- Audit of number blocks handed to devices by reserve_number_block().
create table public.number_blocks (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  device_id uuid not null references public.devices (id) on delete cascade,
  start_seq int not null,
  end_seq int not null,
  reserved_at timestamptz not null default now()
);

-- Mirrors the app's BookingRecord (form data only). `client_updated_at` is the
-- device's epoch-ms clock and decides last-write-wins; `updated_at` is the
-- server clock and drives pull cursors. Deletes are soft (`deleted_at`).
create table public.bookings (
  id uuid primary key,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  template text not null,
  seq int,                                  -- null for provisional (offline) numbers
  booking_no text not null,
  booking_date date not null,
  name text not null default '',
  place text not null default '',
  from_place text not null default '',      -- "from"/"to" are reserved words in SQL
  to_place text not null default '',
  travel_date date,
  departure_time text not null default '',
  return_time text not null default '',
  fare int not null default 0,
  advance int not null default 0,
  mobile text not null default '',
  bus text not null default '',
  pad_color text not null default 'navy',
  page jsonb not null default '{"size":"letter","orientation":"portrait"}'::jsonb,
  created_by uuid not null references auth.users (id),
  updated_by uuid not null references auth.users (id),
  device_id uuid references public.devices (id) on delete set null,
  client_updated_at bigint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  share_pdf_path text,
  share_png_path text,
  share_rendered_at bigint,
  unique (organization_id, booking_no)
);
create index bookings_org_updated on public.bookings (organization_id, updated_at);
create index bookings_org_creator on public.bookings (organization_id, created_by);

-- Server clock on every update (pull cursor).
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- Last-write-wins guard: a push older than the stored version is dropped
-- (returning null skips the update); the pushing device pulls the winner.
create or replace function public.bookings_lww()
returns trigger language plpgsql as $$
begin
  if new.client_updated_at < old.client_updated_at then
    return null;
  end if;
  return new;
end $$;

-- Triggers fire in name order: the LWW guard runs before the timestamp bump.
create trigger bookings_a_lww before update on public.bookings
  for each row execute function public.bookings_lww();
create trigger bookings_b_set_updated_at before update on public.bookings
  for each row execute function public.set_updated_at();

-- Invited users arrive with organization_id / role / display_name in their
-- metadata (set by the invite-staff Edge Function); turn that into rows.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  org uuid := nullif(new.raw_user_meta_data ->> 'organization_id', '')::uuid;
  r text := coalesce(nullif(new.raw_user_meta_data ->> 'role', ''), 'staff');
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(new.email, '@', 1)))
  on conflict (id) do nothing;

  if org is not null then
    insert into public.memberships (organization_id, user_id, role)
    values (org, new.id, r::public.membership_role)
    on conflict (organization_id, user_id) do nothing;
  end if;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
