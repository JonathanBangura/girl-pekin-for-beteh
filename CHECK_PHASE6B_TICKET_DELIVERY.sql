-- Phase 6B read-only verification.
-- Run in the CORRECT Girl Pikin For Betteh Supabase project
-- after completing a real/stage Vult ticket payment.

select
  o.id,
  o.order_number,
  o.status as order_status,
  o.delivery_status,
  o.delivered_at,
  o.delivery_last_error,
  o.public_token,
  o.total_amount,
  o.currency,
  o.created_at
from public.ticket_orders o
order by o.created_at desc
limit 10;

select
  p.id,
  p.ticket_order_id,
  p.provider,
  p.provider_transaction_id,
  p.status as payment_status,
  p.amount,
  p.currency,
  p.paid_at,
  p.failure_reason,
  p.created_at
from public.payments p
where p.payment_type = 'ticket'
order by p.created_at desc
limit 10;

with latest_paid as (
  select id, order_number
  from public.ticket_orders
  where status = 'paid'
  order by created_at desc
  limit 1
)
select
  lp.order_number,
  t.id,
  t.ticket_code,
  t.status,
  t.admission_sequence,
  t.qr_token_hash,
  t.issued_at
from latest_paid lp
join public.tickets t
  on t.ticket_order_id = lp.id
order by t.issued_at, t.admission_sequence;

with latest_paid as (
  select id, order_number
  from public.ticket_orders
  where status = 'paid'
  order by created_at desc
  limit 1
),
expected as (
  select
    oi.ticket_order_id,
    sum(oi.quantity * oi.admissions_per_unit)::bigint
      as expected_ticket_count
  from public.ticket_order_items oi
  join latest_paid lp on lp.id = oi.ticket_order_id
  group by oi.ticket_order_id
),
issued as (
  select
    t.ticket_order_id,
    count(*)::bigint as issued_ticket_count
  from public.tickets t
  join latest_paid lp on lp.id = t.ticket_order_id
  group by t.ticket_order_id
)
select
  lp.order_number,
  coalesce(e.expected_ticket_count, 0) as expected_ticket_count,
  coalesce(i.issued_ticket_count, 0) as issued_ticket_count,
  coalesce(e.expected_ticket_count, 0)
    = coalesce(i.issued_ticket_count, 0)
    as counts_match
from latest_paid lp
left join expected e on e.ticket_order_id = lp.id
left join issued i on i.ticket_order_id = lp.id;

with latest_paid as (
  select id, order_number
  from public.ticket_orders
  where status = 'paid'
  order by created_at desc
  limit 1
)
select
  lp.order_number,
  d.channel,
  d.provider,
  d.recipient,
  d.status,
  d.provider_message_id,
  d.error_message,
  d.attempted_at,
  d.completed_at
from latest_paid lp
left join public.ticket_delivery_attempts d
  on d.ticket_order_id = lp.id
order by d.attempted_at desc;

with latest_payment as (
  select id
  from public.payments
  where payment_type = 'ticket'
  order by created_at desc
  limit 1
)
select
  pe.provider,
  pe.provider_event_id,
  pe.event_type,
  pe.processed_at,
  pe.processing_error,
  pe.received_at
from public.payment_events pe
join latest_payment lp on lp.id = pe.payment_id
order by pe.received_at desc;
