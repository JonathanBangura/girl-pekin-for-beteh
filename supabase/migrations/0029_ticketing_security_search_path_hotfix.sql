-- Girl Pikin For Betteh
-- 0029_ticketing_security_search_path_hotfix.sql
--
-- Non-destructive hotfix for ticketing RPCs that use pgcrypto helpers.
--
-- 0008 added the extensions schema to the original paid-ticket functions,
-- but 0023_event_access_ticket_lifecycle.sql later recreated the paid
-- reservation RPC with search_path=public and introduced additional
-- ticket lifecycle RPCs that also call gen_random_bytes(...).
--
-- This migration changes function configuration only.
-- It does not alter tables or delete data.

begin;

alter function public.create_ticket_order_reservation(
  text, uuid, integer, numeric, text, text, text
)
set search_path = public, extensions;

alter function public.create_free_event_registration(
  text, uuid, integer, text, text, text
)
set search_path = public, extensions;

alter function public.claim_event_invitation(
  uuid, text, text, text
)
set search_path = public, extensions;

alter function public.create_complimentary_ticket_order(
  uuid, uuid, integer, text, text, text, text
)
set search_path = public, extensions;

-- Re-assert the original settlement hotfix too.
alter function public.settle_ticket_payment_success(
  uuid, text, jsonb, timestamptz
)
set search_path = public, extensions;

commit;
