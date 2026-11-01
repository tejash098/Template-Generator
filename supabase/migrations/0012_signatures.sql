-- Signatures (discussed with the owner 2026-11-01, see decisions.md).
--
-- 1. Every booking keeps a snapshot of the signature its issuer chose, printed
--    in place of the staff name. A snapshot (not a reference) so a receipt
--    never changes when the library does, and renders on any device.
-- 2. Each member's signature library, synced across their devices. Only the
--    member themself can read or write their rows; owners see signatures only
--    through the booking snapshots.
--
-- Both are additive and nullable: clients that predate this ignore them, and
-- their upserts never name `signature`, so it is left untouched.

alter table public.bookings
  add column signature jsonb,
  add constraint bookings_signature_size check (signature is null or octet_length(signature::text) <= 200000);

create table public.signatures (
  id uuid primary key,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  label text not null default '',
  mark jsonb not null constraint signatures_mark_size check (octet_length(mark::text) <= 200000),
  client_updated_at bigint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index signatures_user_updated on public.signatures (user_id, updated_at);
create index signatures_organization on public.signatures (organization_id);

-- Same last-write-wins guard and server clock as bookings (both functions are
-- table-agnostic). Triggers fire in name order: the guard runs first.
create trigger signatures_a_lww before update on public.signatures
  for each row execute function public.bookings_lww();
create trigger signatures_b_set_updated_at before update on public.signatures
  for each row execute function public.set_updated_at();

alter table public.signatures enable row level security;

-- Own rows only, inside an organization the member still belongs to; no
-- delete policy (soft delete, like bookings).
create policy "members read own signatures" on public.signatures
  for select to authenticated
  using (user_id = (select auth.uid()) and public.is_member(organization_id));
create policy "members insert own signatures" on public.signatures
  for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_member(organization_id));
create policy "members update own signatures" on public.signatures
  for update to authenticated
  using (user_id = (select auth.uid()) and public.is_member(organization_id))
  with check (user_id = (select auth.uid()) and public.is_member(organization_id));
