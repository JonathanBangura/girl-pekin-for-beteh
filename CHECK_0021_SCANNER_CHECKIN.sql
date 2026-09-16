-- CHECK_0021_SCANNER_CHECKIN.sql

select
  t.ticket_code,
  t.status as ticket_status,
  e.title as event_title,
  e.status as event_status,
  o.order_number,
  o.status as order_status,
  exists (
    select 1 from public.ticket_checkins tc where tc.ticket_id = t.id
  ) as already_checked_in
from public.tickets t
join public.events e on e.id = t.event_id
join public.ticket_orders o on o.id = t.ticket_order_id
where upper(t.ticket_code) = upper('TKT-26-1CBE5461870D');

select
  tc.id,
  t.ticket_code,
  tc.checked_in_at,
  tc.device_label
from public.ticket_checkins tc
join public.tickets t on t.id = tc.ticket_id
where upper(t.ticket_code) = upper('TKT-26-1CBE5461870D');
