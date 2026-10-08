-- VERIFY 0029 TICKETING SECURITY SEARCH PATH
-- Read-only verification after running the migration.

-- 1. pgcrypto should exist. On Supabase its schema is normally "extensions".
select
  e.extname,
  n.nspname as extension_schema,
  e.extversion
from pg_extension e
join pg_namespace n
  on n.oid = e.extnamespace
where e.extname = 'pgcrypto';

-- 2. Every affected function should include "public, extensions".
select
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  p.proconfig as function_config
from pg_proc p
join pg_namespace n
  on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'create_ticket_order_reservation',
    'create_free_event_registration',
    'claim_event_invitation',
    'create_complimentary_ticket_order',
    'settle_ticket_payment_success'
  )
order by p.proname;

-- 3. Confirm the pgcrypto helpers are callable.
select
  encode(extensions.gen_random_bytes(6), 'hex') as random_bytes_test,
  encode(
    extensions.digest('gpfb-ticketing-test', 'sha256'),
    'hex'
  ) as digest_test;

-- 4. Optional: inspect the current paid reservation function.
select
  pg_get_functiondef(
    'public.create_ticket_order_reservation(text,uuid,integer,numeric,text,text,text)'::regprocedure
  ) as reservation_function_definition;
