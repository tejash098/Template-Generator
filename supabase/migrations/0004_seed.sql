-- The one organization this deployment serves. Fixed id so the app, tests
-- and the first owner's membership can refer to it.
insert into public.organizations (id, name)
values ('0d1f2c88-6b2a-4d63-9f7e-4e2f1c3a9b10', 'Shri Ram Bus Service')
on conflict (id) do nothing;

insert into public.organization_counters (organization_id, next_seq)
values ('0d1f2c88-6b2a-4d63-9f7e-4e2f1c3a9b10', 1)
on conflict (organization_id) do nothing;
