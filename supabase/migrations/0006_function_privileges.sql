-- Advisor follow-up: pin search_path on every function and remove the default
-- PUBLIC execute grant so only the roles that need each function keep it.
-- RLS policies call the is_* helpers as the signed-in user, so `authenticated`
-- keeps EXECUTE on those; the auth trigger runs as supabase_auth_admin.

alter function public.device_code_for(int) set search_path = public;
alter function public.set_updated_at() set search_path = public;
alter function public.bookings_lww() set search_path = public;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.handle_new_user() to supabase_auth_admin;

revoke execute on function public.device_code_for(int) from public, anon, authenticated;

revoke execute on function public.is_member(uuid) from public, anon;
revoke execute on function public.is_owner(uuid) from public, anon;
revoke execute on function public.is_member_of_text(text) from public, anon;
revoke execute on function public.shares_organization_with(uuid) from public, anon;
revoke execute on function public.my_membership() from public, anon;
revoke execute on function public.register_device(uuid, text) from public, anon;
revoke execute on function public.reserve_number_block(uuid, int) from public, anon;
revoke execute on function public.ensure_counter_at_least(int) from public, anon;

grant execute on function
  public.is_member(uuid),
  public.is_owner(uuid),
  public.is_member_of_text(text),
  public.shares_organization_with(uuid),
  public.my_membership(),
  public.register_device(uuid, text),
  public.reserve_number_block(uuid, int),
  public.ensure_counter_at_least(int)
to authenticated, service_role;
