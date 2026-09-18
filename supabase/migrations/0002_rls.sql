-- Row Level Security. Owners see and edit everything in their organization;
-- staff see and edit only the bookings they created. Nothing crosses
-- organizations. Counters and number blocks are written only by RPCs.

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.memberships enable row level security;
alter table public.devices enable row level security;
alter table public.organization_counters enable row level security;
alter table public.number_blocks enable row level security;
alter table public.bookings enable row level security;

-- Helpers run as the definer so policies do not recurse into memberships' own RLS.
create or replace function public.is_member(org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.memberships m
    where m.organization_id = org and m.user_id = auth.uid() and m.revoked_at is null
  );
$$;

create or replace function public.is_owner(org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.memberships m
    where m.organization_id = org and m.user_id = auth.uid() and m.revoked_at is null and m.role = 'owner'
  );
$$;

-- Text variant for storage paths ({organization_id}/{booking_id}/file), which
-- must not raise on a malformed first folder.
create or replace function public.is_member_of_text(org text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.memberships m
    where m.organization_id::text = org and m.user_id = auth.uid() and m.revoked_at is null
  );
$$;

create or replace function public.shares_organization_with(other uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.memberships a
    join public.memberships b on b.organization_id = a.organization_id
    where a.user_id = auth.uid() and a.revoked_at is null and b.user_id = other
  );
$$;

-- organizations
create policy "members read their organization" on public.organizations
  for select to authenticated using (public.is_member(id));

-- profiles
create policy "members read co-member profiles" on public.profiles
  for select to authenticated using (id = auth.uid() or public.shares_organization_with(id));
create policy "users update own profile" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- memberships (owners manage others, never their own row)
create policy "members read memberships" on public.memberships
  for select to authenticated using (public.is_member(organization_id));
create policy "owners add memberships" on public.memberships
  for insert to authenticated with check (public.is_owner(organization_id) and user_id <> auth.uid());
create policy "owners update memberships" on public.memberships
  for update to authenticated
  using (public.is_owner(organization_id) and user_id <> auth.uid())
  with check (public.is_owner(organization_id) and user_id <> auth.uid());

-- devices / counters / blocks: readable by members, written by RPCs only
create policy "members read devices" on public.devices
  for select to authenticated using (public.is_member(organization_id));
create policy "members read counters" on public.organization_counters
  for select to authenticated using (public.is_member(organization_id));
create policy "members read number blocks" on public.number_blocks
  for select to authenticated using (public.is_member(organization_id));

-- bookings: owners all rows, staff their own; no delete policy (soft delete)
create policy "members read bookings" on public.bookings
  for select to authenticated
  using (public.is_member(organization_id) and (public.is_owner(organization_id) or created_by = auth.uid()));
create policy "members insert own bookings" on public.bookings
  for insert to authenticated
  with check (public.is_member(organization_id) and created_by = auth.uid() and updated_by = auth.uid());
create policy "members update bookings" on public.bookings
  for update to authenticated
  using (public.is_member(organization_id) and (public.is_owner(organization_id) or created_by = auth.uid()))
  with check (public.is_member(organization_id) and (public.is_owner(organization_id) or created_by = auth.uid()) and updated_by = auth.uid());

-- Live updates for the sync engine (Realtime applies these same policies).
alter publication supabase_realtime add table public.bookings;
