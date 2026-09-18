-- RPCs called by the app. All run as the definer so they can write the tables
-- that have no insert/update policies (devices, counters, number_blocks).

-- The caller's active membership (one organization per user for now).
create or replace function public.my_membership()
returns table (organization_id uuid, organization_name text, role public.membership_role, display_name text)
language sql stable security definer set search_path = public as $$
  select m.organization_id, o.name, m.role, coalesce(p.display_name, '')
  from public.memberships m
  join public.organizations o on o.id = m.organization_id
  left join public.profiles p on p.id = m.user_id
  where m.user_id = auth.uid() and m.revoked_at is null
  order by m.created_at
  limit 1;
$$;

-- A, B, ..., Z, AA, AB, ...
create or replace function public.device_code_for(n int)
returns text language sql immutable as $$
  select case
    when n < 26 then chr(65 + n)
    else chr(65 + (n / 26) - 1) || chr(65 + (n % 26))
  end;
$$;

-- Registers (or re-attaches) the caller's device and returns its letter code.
create or replace function public.register_device(p_device_id uuid, p_name text default '')
returns text language plpgsql security definer set search_path = public as $$
declare
  org uuid;
  existing text;
  n int;
  code text;
begin
  select m.organization_id into org
  from public.memberships m
  where m.user_id = auth.uid() and m.revoked_at is null
  order by m.created_at limit 1;
  if org is null then
    raise exception 'not a member of any organization' using errcode = '42501';
  end if;

  select d.code into existing from public.devices d where d.id = p_device_id and d.organization_id = org;
  if existing is not null then
    update public.devices set user_id = auth.uid(), name = coalesce(p_name, name), last_seen_at = now()
    where id = p_device_id;
    return existing;
  end if;

  select count(*) into n from public.devices d where d.organization_id = org;
  loop
    code := public.device_code_for(n);
    begin
      insert into public.devices (id, organization_id, user_id, code, name)
      values (p_device_id, org, auth.uid(), code, coalesce(p_name, ''));
      return code;
    exception when unique_violation then
      n := n + 1;
    end;
  end loop;
end $$;

-- Hands the device the next block of booking numbers, atomically.
create or replace function public.reserve_number_block(p_device_id uuid, p_size int default 20)
returns table (start_seq int, end_seq int)
language plpgsql security definer set search_path = public as $$
declare
  org uuid;
  s int;
begin
  if p_size < 1 or p_size > 100 then
    raise exception 'block size must be between 1 and 100';
  end if;
  select d.organization_id into org from public.devices d where d.id = p_device_id and d.user_id = auth.uid();
  if org is null or not public.is_member(org) then
    raise exception 'unknown device' using errcode = '42501';
  end if;

  insert into public.organization_counters (organization_id) values (org) on conflict do nothing;
  update public.organization_counters c
  set next_seq = c.next_seq + p_size
  where c.organization_id = org
  returning c.next_seq - p_size into s;

  insert into public.number_blocks (organization_id, device_id, start_seq, end_seq)
  values (org, p_device_id, s, s + p_size - 1);

  return query select s, s + p_size - 1;
end $$;

-- Before a device uploads bookings numbered before it ever signed in, move the
-- sequence past them so later blocks cannot collide with printed receipts.
create or replace function public.ensure_counter_at_least(p_next int)
returns void language plpgsql security definer set search_path = public as $$
declare
  org uuid;
begin
  select m.organization_id into org
  from public.memberships m
  where m.user_id = auth.uid() and m.revoked_at is null
  order by m.created_at limit 1;
  if org is null then
    raise exception 'not a member of any organization' using errcode = '42501';
  end if;
  insert into public.organization_counters (organization_id, next_seq)
  values (org, greatest(1, p_next))
  on conflict (organization_id) do update set next_seq = greatest(public.organization_counters.next_seq, excluded.next_seq);
end $$;

-- Only signed-in users may call these.
revoke execute on function public.my_membership() from anon;
revoke execute on function public.register_device(uuid, text) from anon;
revoke execute on function public.reserve_number_block(uuid, int) from anon;
revoke execute on function public.ensure_counter_at_least(int) from anon;
