-- Advisor follow-up to 0010: `create extension pg_net` without a schema records
-- the extension in `public` (lint 0014_extension_in_public). Re-create it in
-- `extensions`; its functions and queue stay in the `net` schema, so the
-- bookings_calendar_hook() trigger function is unaffected.
drop extension if exists pg_net;
create extension pg_net with schema extensions;
