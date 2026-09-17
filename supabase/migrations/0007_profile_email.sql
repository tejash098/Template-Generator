-- The Team page lists members by email, but auth.users is not readable from
-- the client; copy the email into profiles when the user is created.
alter table public.profiles add column email text not null default '';

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  org uuid := nullif(new.raw_user_meta_data ->> 'organization_id', '')::uuid;
  r text := coalesce(nullif(new.raw_user_meta_data ->> 'role', ''), 'staff');
begin
  insert into public.profiles (id, display_name, email)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(coalesce(new.email, ''), '@', 1)),
    coalesce(new.email, '')
  )
  on conflict (id) do update set email = excluded.email;

  if org is not null then
    insert into public.memberships (organization_id, user_id, role)
    values (org, new.id, r::public.membership_role)
    on conflict (organization_id, user_id) do nothing;
  end if;
  return new;
end $$;
