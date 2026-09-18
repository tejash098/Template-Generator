-- Team management for owners: edit another member's display name and role in
-- one atomic call, and remove a membership outright.
--
-- Why a function: RLS already lets owners update other members' `memberships`
-- rows, but `profiles` is self-only ("users update own profile"), so the name
-- change needs definer rights. Owners can never act on their own row, which
-- guarantees the acting owner remains.

create or replace function public.update_member(
  p_organization_id uuid,
  p_user_id uuid,
  p_display_name text,
  p_role public.membership_role
)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_owner(p_organization_id) or p_user_id = auth.uid() then
    raise exception 'only owners may edit other members' using errcode = '42501';
  end if;

  update public.memberships set role = p_role
  where organization_id = p_organization_id and user_id = p_user_id;
  if not found then
    raise exception 'not a member' using errcode = '42501';
  end if;

  -- An empty name keeps the existing one.
  update public.profiles
  set display_name = coalesce(nullif(trim(p_display_name), ''), display_name)
  where id = p_user_id;
end $$;

revoke execute on function public.update_member(uuid, uuid, text, public.membership_role) from public, anon;
grant execute on function public.update_member(uuid, uuid, text, public.membership_role) to authenticated, service_role;

-- "Remove from team": the membership row goes; the auth user, profile and
-- their bookings stay, and a later invite re-creates the membership.
create policy "owners delete memberships" on public.memberships
  for delete to authenticated
  using (public.is_owner(organization_id) and user_id <> auth.uid());
