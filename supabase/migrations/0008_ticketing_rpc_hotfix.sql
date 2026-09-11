-- 0008_ticketing_rpc_hotfix.sql
begin;

alter function public.create_ticket_order_reservation(
  text, uuid, integer, numeric, text, text, text
)
set search_path = public, extensions;

alter function public.settle_ticket_payment_success(
  uuid, text, jsonb, timestamptz
)
set search_path = public, extensions;

commit;
