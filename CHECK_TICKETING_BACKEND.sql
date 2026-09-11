-- Run in the CORRECT Supabase SQL Editor. Read-only checks.

select
  to_regprocedure(
    'public.create_ticket_order_reservation(text,uuid,integer,numeric,text,text,text)'
  ) as reservation_function;

select
  id, slug, title, status, is_public, access_type, capacity
from public.events
where slug = '50misa-2026';

select
  tt.id,
  tt.name,
  tt.pricing_type,
  tt.price,
  tt.min_donation,
  tt.currency,
  tt.is_active,
  tt.capacity,
  tt.max_per_order,
  tt.sales_starts_at,
  tt.sales_ends_at,
  tt.admissions_per_unit
from public.ticket_types tt
join public.events e on e.id = tt.event_id
where e.slug = '50misa-2026'
order by tt.sort_order, tt.name;

select
  n.nspname as schema_name,
  p.proname as function_name
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where p.proname in ('gen_random_bytes', 'digest')
order by p.proname, n.nspname;
