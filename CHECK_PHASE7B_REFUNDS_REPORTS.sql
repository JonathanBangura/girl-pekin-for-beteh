-- Phase 7B read-only verification.
-- Run in the correct Girl Pikin For Betteh Supabase project.

-- 1. Refund control function exists.
select to_regprocedure(
  'public.record_external_full_refund(uuid,text,text,text,text,text)'
) as refund_function;

-- 2. Refund-control columns exist.
select
  column_name,
  data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'refunds'
  and column_name in (
    'refund_kind',
    'external_method',
    'notes',
    'completed_by',
    'provider_confirmed_at'
  )
order by column_name;

-- 3. No payment should have more than one successful full refund/reversal.
select
  payment_id,
  count(*) as successful_refund_count
from public.refunds
where status = 'succeeded'
group by payment_id
having count(*) > 1;

-- 4. Full refund amount must match original payment amount.
select
  r.id as refund_id,
  r.payment_id,
  r.amount as refund_amount,
  p.amount as payment_amount,
  r.refund_kind,
  r.provider_refund_id
from public.refunds r
join public.payments p on p.id = r.payment_id
where r.status = 'succeeded'
  and r.amount <> p.amount;

-- 5. Successful vote refunds/reversals must have a negative ledger entry.
select
  r.id as refund_id,
  p.id as payment_id,
  vo.order_number,
  r.refund_kind
from public.refunds r
join public.payments p on p.id = r.payment_id
join public.vote_orders vo on vo.id = p.vote_order_id
left join public.vote_ledger vl
  on vl.payment_id = p.id
 and vl.entry_type in ('refund', 'reversal')
 and vl.quantity_delta < 0
where r.status = 'succeeded'
  and p.payment_type = 'vote'
  and vl.id is null;

-- 6. Refunded/reversed ticket payments must not retain active tickets.
select
  p.id as payment_id,
  o.order_number,
  p.status as payment_status,
  count(t.id) filter (where t.status = 'active') as active_tickets
from public.payments p
join public.ticket_orders o on o.id = p.ticket_order_id
left join public.tickets t on t.ticket_order_id = o.id
where p.payment_type = 'ticket'
  and p.status in ('refunded', 'reversed')
group by p.id, o.order_number, p.status
having count(t.id) filter (where t.status = 'active') > 0;

-- 7. Refund register summary.
select
  r.refund_kind,
  p.payment_type,
  p.provider,
  p.currency,
  count(*) as refund_count,
  sum(r.amount) as total_amount
from public.refunds r
join public.payments p on p.id = r.payment_id
where r.status = 'succeeded'
group by r.refund_kind, p.payment_type, p.provider, p.currency
order by r.refund_kind, p.payment_type, p.provider, p.currency;

-- 8. Latest refund/reversal audit records.
select
  action,
  entity_type,
  entity_id,
  actor_user_id,
  new_data,
  metadata,
  created_at
from public.audit_logs
where action in (
  'external_full_refund_recorded',
  'external_full_reversal_recorded'
)
order by created_at desc
limit 25;
