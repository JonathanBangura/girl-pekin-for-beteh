-- Phase 6C read-only verification.
-- Run in the correct Supabase project after scanner testing.

-- 1. Check that the atomic scanner function exists.
select to_regprocedure(
  'public.check_in_ticket(uuid,text,text,text)'
) as scanner_function;

-- 2. Recent successful check-ins.
select
  c.id,
  e.title as event,
  t.ticket_code,
  t.status as ticket_status,
  t.holder_name,
  oi.ticket_type_name,
  c.device_label,
  c.checked_in_at
from public.ticket_checkins c
join public.tickets t on t.id = c.ticket_id
join public.ticket_order_items oi on oi.id = t.ticket_order_item_id
join public.events e on e.id = c.event_id
order by c.checked_in_at desc
limit 25;

-- 3. Prove one-time admission: this should return zero rows.
select
  ticket_id,
  count(*) as checkin_count
from public.ticket_checkins
group by ticket_id
having count(*) > 1;

-- 4. Per-event admission totals.
select
  e.id,
  e.title,
  count(distinct t.id) filter (where t.status = 'active') as active_tickets,
  count(distinct c.ticket_id) as checked_in,
  greatest(
    count(distinct t.id) filter (where t.status = 'active')
      - count(distinct c.ticket_id),
    0
  ) as remaining
from public.events e
left join public.tickets t on t.event_id = e.id
left join public.ticket_checkins c on c.ticket_id = t.id
where e.status in ('published', 'sales_closed', 'completed')
group by e.id, e.title
order by e.starts_at desc nulls last;
