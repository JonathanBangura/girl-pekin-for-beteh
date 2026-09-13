-- Phase 7A Finance Operations read-only verification.

-- 1. Payment status totals.
select
  payment_type,
  provider,
  status,
  currency,
  count(*) as payment_count,
  sum(amount) as total_amount
from public.payments
group by payment_type, provider, status, currency
order by payment_type, provider, status, currency;

-- 2. Unprocessed / errored provider events.
select
  id,
  provider,
  provider_event_id,
  payment_id,
  event_type,
  processed_at,
  processing_error,
  received_at
from public.payment_events
where processed_at is null
   or processing_error is not null
order by received_at desc;

-- 3. Successful vote payments missing a ledger entry.
select
  p.id as payment_id,
  o.order_number,
  p.status as payment_status,
  o.status as order_status
from public.payments p
join public.vote_orders o
  on o.id = p.vote_order_id
left join public.vote_ledger vl
  on vl.payment_id = p.id
where p.payment_type = 'vote'
  and p.status = 'succeeded'
  and (
    o.status <> 'paid'
    or vl.id is null
  );

-- 4. Successful ticket payments whose order is not paid.
select
  p.id as payment_id,
  o.order_number,
  p.status as payment_status,
  o.status as order_status
from public.payments p
join public.ticket_orders o
  on o.id = p.ticket_order_id
where p.payment_type = 'ticket'
  and p.status = 'succeeded'
  and o.status <> 'paid';

-- 5. Paid ticket orders where expected admissions do not match issued tickets.
with expected as (
  select
    oi.ticket_order_id,
    sum(
      oi.quantity * oi.admissions_per_unit
    )::bigint as expected_count
  from public.ticket_order_items oi
  group by oi.ticket_order_id
),
issued as (
  select
    t.ticket_order_id,
    count(*)::bigint as issued_count
  from public.tickets t
  group by t.ticket_order_id
)
select
  o.id,
  o.order_number,
  coalesce(e.expected_count, 0) as expected_count,
  coalesce(i.issued_count, 0) as issued_count
from public.ticket_orders o
left join expected e on e.ticket_order_id = o.id
left join issued i on i.ticket_order_id = o.id
where o.status = 'paid'
  and coalesce(e.expected_count, 0)
      <> coalesce(i.issued_count, 0)
order by o.created_at desc;

-- 6. Failed ticket email deliveries.
select
  order_number,
  delivery_status,
  delivery_last_error,
  delivered_at,
  created_at
from public.ticket_orders
where delivery_status = 'failed'
order by created_at desc;

-- 7. Stale pending/processing payments older than 30 minutes.
select
  id,
  payment_type,
  provider,
  amount,
  currency,
  status,
  failure_reason,
  created_at
from public.payments
where status in ('pending', 'processing')
  and created_at < now() - interval '30 minutes'
order by created_at;
