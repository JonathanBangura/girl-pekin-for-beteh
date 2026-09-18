-- CHECK_0023_EVENT_ACCESS_TICKETS.sql

select
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'ticket_orders'
  and column_name in (
    'source_type',
    'source_reference_id',
    'confirmed_at',
    'created_by',
    'access_note'
  )
order by column_name;

select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name = 'event_invitations';

select
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  p.prosecdef as security_definer
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'create_free_event_registration',
    'get_public_event_invitation',
    'claim_event_invitation',
    'create_complimentary_ticket_order',
    'cancel_event_ticket',
    'reissue_event_ticket',
    'reserved_ticket_admissions'
  )
order by p.proname;

select
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'tickets'
  and indexname in (
    'tickets_item_sequence_unique',
    'tickets_active_item_sequence_unique'
  );

select
  id,
  title,
  access_type,
  status,
  is_public,
  capacity
from public.events
order by starts_at desc nulls last;

select
  order_number,
  source_type,
  status,
  purchaser_name,
  total_amount,
  confirmed_at,
  created_at
from public.ticket_orders
where source_type <> 'paid'
order by created_at desc
limit 50;
