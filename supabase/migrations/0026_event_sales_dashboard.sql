-- Girl Pikin For Betteh
-- Phase 16 Event Sales Dashboard
-- LIVE SUPABASE / DIRECT GITHUB VERSION
--
-- Run this entire file FIRST in:
-- Supabase Dashboard -> SQL Editor -> New query
--
-- Then create the same file in GitHub at:
-- supabase/migrations/0026_event_sales_dashboard.sql
--
-- Purpose:
-- 1) event-scoped sales/revenue reporting backed by payments/refunds
-- 2) exact event admissions, issued tickets, check-ins and remaining capacity
-- 3) payment-method breakdown: Vult App / Mobile Money / Card / Unknown
-- 4) paginated event sales records for the admin dashboard and CSV export
--
-- Safety:
-- - read/reporting only
-- - no payment, order, ticket, check-in or refund record is changed

begin;

create index if not exists payments_ticket_paid_at_idx
  on public.payments(ticket_order_id, paid_at desc)
  where payment_type = 'ticket'
    and paid_at is not null;

create index if not exists refunds_payment_processed_succeeded_idx
  on public.refunds(payment_id, processed_at desc)
  where status = 'succeeded';

-- Authenticated helper used only to list events the current staff member
-- is explicitly authorized to manage, or all events for global Finance.
create or replace function public.event_sales_accessible_events()
returns table (
  id uuid,
  title text,
  slug text,
  venue text,
  starts_at timestamptz,
  ends_at timestamptz,
  access_type text,
  status text,
  capacity integer
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select
    e.id,
    e.title,
    e.slug,
    e.venue,
    e.starts_at,
    e.ends_at,
    e.access_type,
    e.status,
    e.capacity
  from public.events e
  where
    public.has_permission('events.manage', 'event', e.id)
    or public.has_permission('finance.manage')
  order by e.starts_at desc nulls last, e.title;
$$;

revoke all on function public.event_sales_accessible_events()
  from public, anon;

grant execute on function public.event_sales_accessible_events()
  to authenticated;

create or replace function public.event_sales_summary(
  p_event_id uuid,
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_status text default null,
  p_method text default null
)
returns table (
  paid_order_count bigint,
  admissions_sold bigint,
  active_tickets bigint,
  checkin_count bigint,
  reserved_admissions bigint,
  remaining_capacity bigint,
  refund_count bigint,
  revenue_by_currency jsonb,
  method_breakdown jsonb,
  ticket_type_breakdown jsonb,
  access_breakdown jsonb
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with event_info as (
    select e.id, e.capacity
    from public.events e
    where e.id = p_event_id
  ),
  candidate_payments as (
    select
      p.id,
      p.ticket_order_id,
      p.provider,
      p.amount,
      p.currency,
      p.status,
      p.paid_at,
      p.created_at,
      case lower(
        coalesce(p.provider_payload ->> 'payment_method', '')
      )
        when 'in-app' then 'in-app'
        when 'momo' then 'momo'
        when 'card' then 'card'
        else 'unknown'
      end::text as payment_method
    from public.payments p
    join public.ticket_orders o
      on o.id = p.ticket_order_id
    where p.payment_type = 'ticket'
      and o.event_id = p_event_id
      and p.status in (
        'succeeded',
        'refunded',
        'partially_refunded',
        'reversed'
      )
      and p.paid_at is not null
      and (p_from is null or p.paid_at >= p_from)
      and (p_to is null or p.paid_at <= p_to)
      and (
        p_status is null
        or p_status = ''
        or p.status = p_status
      )
      and (
        p_method is null
        or p_method = ''
        or (
          case lower(
            coalesce(p.provider_payload ->> 'payment_method', '')
          )
            when 'in-app' then 'in-app'
            when 'momo' then 'momo'
            when 'card' then 'card'
            else 'unknown'
          end
        ) = p_method
      )
  ),
  sales_payments as (
    select distinct on (cp.ticket_order_id)
      cp.*
    from candidate_payments cp
    order by
      cp.ticket_order_id,
      cp.paid_at desc nulls last,
      cp.created_at desc,
      cp.id desc
  ),
  sales_orders as (
    select sp.ticket_order_id
    from sales_payments sp
  ),
  sales_admissions as (
    select
      coalesce(
        sum(i.quantity * i.admissions_per_unit),
        0
      )::bigint as admissions
    from public.ticket_order_items i
    join sales_orders so
      on so.ticket_order_id = i.ticket_order_id
  ),
  gross_currency as (
    select
      sp.currency,
      sum(sp.amount)::numeric as gross
    from sales_payments sp
    group by sp.currency
  ),
  refund_period as (
    select
      r.id,
      r.payment_id,
      r.amount,
      r.processed_at,
      p.currency,
      p.status as payment_status,
      case lower(
        coalesce(p.provider_payload ->> 'payment_method', '')
      )
        when 'in-app' then 'in-app'
        when 'momo' then 'momo'
        when 'card' then 'card'
        else 'unknown'
      end::text as payment_method
    from public.refunds r
    join public.payments p
      on p.id = r.payment_id
    join public.ticket_orders o
      on o.id = p.ticket_order_id
    where r.status = 'succeeded'
      and p.payment_type = 'ticket'
      and o.event_id = p_event_id
      and (p_from is null or r.processed_at >= p_from)
      and (p_to is null or r.processed_at <= p_to)
      and (
        p_status is null
        or p_status = ''
        or p.status = p_status
      )
      and (
        p_method is null
        or p_method = ''
        or (
          case lower(
            coalesce(p.provider_payload ->> 'payment_method', '')
          )
            when 'in-app' then 'in-app'
            when 'momo' then 'momo'
            when 'card' then 'card'
            else 'unknown'
          end
        ) = p_method
      )
  ),
  refund_currency as (
    select
      rp.currency,
      sum(rp.amount)::numeric as refunds
    from refund_period rp
    group by rp.currency
  ),
  currencies as (
    select currency from gross_currency
    union
    select currency from refund_currency
  ),
  revenue_rows as (
    select
      c.currency,
      coalesce(g.gross, 0)::numeric as gross,
      coalesce(r.refunds, 0)::numeric as refunds,
      (
        coalesce(g.gross, 0)
        - coalesce(r.refunds, 0)
      )::numeric as net
    from currencies c
    left join gross_currency g
      on g.currency = c.currency
    left join refund_currency r
      on r.currency = c.currency
  ),
  method_gross as (
    select
      sp.payment_method,
      sp.currency,
      count(*)::bigint as payment_count,
      sum(sp.amount)::numeric as gross
    from sales_payments sp
    group by sp.payment_method, sp.currency
  ),
  method_refunds as (
    select
      rp.payment_method,
      rp.currency,
      count(*)::bigint as refund_count,
      sum(rp.amount)::numeric as refunds
    from refund_period rp
    group by rp.payment_method, rp.currency
  ),
  method_keys as (
    select payment_method, currency from method_gross
    union
    select payment_method, currency from method_refunds
  ),
  method_rows as (
    select
      k.payment_method,
      k.currency,
      coalesce(g.payment_count, 0)::bigint as payment_count,
      coalesce(r.refund_count, 0)::bigint as refund_count,
      coalesce(g.gross, 0)::numeric as gross,
      coalesce(r.refunds, 0)::numeric as refunds,
      (
        coalesce(g.gross, 0)
        - coalesce(r.refunds, 0)
      )::numeric as net
    from method_keys k
    left join method_gross g
      on g.payment_method = k.payment_method
     and g.currency = k.currency
    left join method_refunds r
      on r.payment_method = k.payment_method
     and r.currency = k.currency
  ),
  ticket_type_rows as (
    select
      i.ticket_type_id,
      i.ticket_type_name,
      o.currency,
      sum(i.quantity)::bigint as units,
      sum(
        i.quantity * i.admissions_per_unit
      )::bigint as admissions,
      sum(i.line_total)::numeric as gross
    from public.ticket_order_items i
    join public.ticket_orders o
      on o.id = i.ticket_order_id
    join sales_orders so
      on so.ticket_order_id = i.ticket_order_id
    group by
      i.ticket_type_id,
      i.ticket_type_name,
      o.currency
  ),
  current_reserved as (
    select
      coalesce(
        sum(i.quantity * i.admissions_per_unit),
        0
      )::bigint as admissions
    from public.ticket_order_items i
    join public.ticket_orders o
      on o.id = i.ticket_order_id
    where o.event_id = p_event_id
      and (
        o.status in ('paid', 'confirmed')
        or (
          o.status in ('pending', 'payment_pending')
          and (
            o.expires_at is null
            or o.expires_at > now()
          )
        )
      )
  ),
  current_access as (
    select
      o.source_type,
      sum(
        i.quantity * i.admissions_per_unit
      )::bigint as admissions
    from public.ticket_orders o
    join public.ticket_order_items i
      on i.ticket_order_id = o.id
    where o.event_id = p_event_id
      and o.status in ('paid', 'confirmed')
    group by o.source_type
  )
  select
    (select count(*) from sales_payments)::bigint,
    (select admissions from sales_admissions)::bigint,
    (
      select count(*)
      from public.tickets t
      where t.event_id = p_event_id
        and t.status = 'active'
    )::bigint,
    (
      select count(*)
      from public.ticket_checkins tc
      where tc.event_id = p_event_id
    )::bigint,
    (select admissions from current_reserved)::bigint,
    (
      select
        case
          when ei.capacity is null then null
          else greatest(
            ei.capacity::bigint
            - (select admissions from current_reserved),
            0
          )
        end
      from event_info ei
    )::bigint,
    (select count(*) from refund_period)::bigint,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'currency', rr.currency,
            'gross', rr.gross,
            'refunds', rr.refunds,
            'net', rr.net
          )
          order by rr.currency
        )
        from revenue_rows rr
      ),
      '[]'::jsonb
    ),
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'payment_method', mr.payment_method,
            'currency', mr.currency,
            'payment_count', mr.payment_count,
            'refund_count', mr.refund_count,
            'gross', mr.gross,
            'refunds', mr.refunds,
            'net', mr.net
          )
          order by mr.payment_method, mr.currency
        )
        from method_rows mr
      ),
      '[]'::jsonb
    ),
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'ticket_type_id', tr.ticket_type_id,
            'ticket_type_name', tr.ticket_type_name,
            'currency', tr.currency,
            'units', tr.units,
            'admissions', tr.admissions,
            'gross', tr.gross
          )
          order by tr.ticket_type_name, tr.currency
        )
        from ticket_type_rows tr
      ),
      '[]'::jsonb
    ),
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'source_type', ca.source_type,
            'admissions', ca.admissions
          )
          order by ca.source_type
        )
        from current_access ca
      ),
      '[]'::jsonb
    );
$$;

create or replace function public.event_sales_page(
  p_event_id uuid,
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_status text default null,
  p_method text default null,
  p_page integer default 1,
  p_page_size integer default 50
)
returns table (
  payment_id uuid,
  ticket_order_id uuid,
  order_number text,
  purchaser_name text,
  purchaser_email text,
  purchaser_phone text,
  ticket_types text,
  units bigint,
  admissions bigint,
  payment_method text,
  provider text,
  gross_amount numeric,
  currency text,
  payment_status text,
  order_status text,
  paid_at timestamptz,
  refund_amount numeric,
  current_net numeric,
  total_count bigint
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with candidate_payments as (
    select
      p.id,
      p.ticket_order_id,
      p.provider,
      p.amount,
      p.currency,
      p.status,
      p.paid_at,
      p.created_at,
      case lower(
        coalesce(p.provider_payload ->> 'payment_method', '')
      )
        when 'in-app' then 'in-app'
        when 'momo' then 'momo'
        when 'card' then 'card'
        else 'unknown'
      end::text as payment_method
    from public.payments p
    join public.ticket_orders o
      on o.id = p.ticket_order_id
    where p.payment_type = 'ticket'
      and o.event_id = p_event_id
      and p.status in (
        'succeeded',
        'refunded',
        'partially_refunded',
        'reversed'
      )
      and p.paid_at is not null
      and (p_from is null or p.paid_at >= p_from)
      and (p_to is null or p.paid_at <= p_to)
      and (
        p_status is null
        or p_status = ''
        or p.status = p_status
      )
      and (
        p_method is null
        or p_method = ''
        or (
          case lower(
            coalesce(p.provider_payload ->> 'payment_method', '')
          )
            when 'in-app' then 'in-app'
            when 'momo' then 'momo'
            when 'card' then 'card'
            else 'unknown'
          end
        ) = p_method
      )
  ),
  sales_payments as (
    select distinct on (cp.ticket_order_id)
      cp.*
    from candidate_payments cp
    order by
      cp.ticket_order_id,
      cp.paid_at desc nulls last,
      cp.created_at desc,
      cp.id desc
  ),
  item_totals as (
    select
      i.ticket_order_id,
      string_agg(
        distinct i.ticket_type_name,
        ', '
        order by i.ticket_type_name
      )::text as ticket_types,
      sum(i.quantity)::bigint as units,
      sum(
        i.quantity * i.admissions_per_unit
      )::bigint as admissions
    from public.ticket_order_items i
    group by i.ticket_order_id
  ),
  refund_totals as (
    select
      r.payment_id,
      sum(r.amount)::numeric as refund_amount
    from public.refunds r
    where r.status = 'succeeded'
    group by r.payment_id
  ),
  rows as (
    select
      sp.id as payment_id,
      o.id as ticket_order_id,
      o.order_number,
      o.purchaser_name,
      o.purchaser_email,
      o.purchaser_phone,
      coalesce(it.ticket_types, 'Event Ticket')::text as ticket_types,
      coalesce(it.units, 0)::bigint as units,
      coalesce(it.admissions, 0)::bigint as admissions,
      sp.payment_method,
      sp.provider,
      sp.amount::numeric as gross_amount,
      sp.currency,
      sp.status::text as payment_status,
      o.status::text as order_status,
      sp.paid_at,
      coalesce(rt.refund_amount, 0)::numeric as refund_amount,
      (
        sp.amount
        - coalesce(rt.refund_amount, 0)
      )::numeric as current_net
    from sales_payments sp
    join public.ticket_orders o
      on o.id = sp.ticket_order_id
    left join item_totals it
      on it.ticket_order_id = o.id
    left join refund_totals rt
      on rt.payment_id = sp.id
  ),
  counted as (
    select
      r.*,
      count(*) over()::bigint as total_count
    from rows r
  )
  select
    c.payment_id,
    c.ticket_order_id,
    c.order_number,
    c.purchaser_name,
    c.purchaser_email,
    c.purchaser_phone,
    c.ticket_types,
    c.units,
    c.admissions,
    c.payment_method,
    c.provider,
    c.gross_amount,
    c.currency,
    c.payment_status,
    c.order_status,
    c.paid_at,
    c.refund_amount,
    c.current_net,
    c.total_count
  from counted c
  order by c.paid_at desc nulls last, c.payment_id desc
  limit least(
    greatest(coalesce(p_page_size, 50), 1),
    100
  )
  offset (
    greatest(coalesce(p_page, 1), 1) - 1
  ) * least(
    greatest(coalesce(p_page_size, 50), 1),
    100
  );
$$;

revoke all on function public.event_sales_summary(
  uuid, timestamptz, timestamptz, text, text
)
from public, anon, authenticated;

revoke all on function public.event_sales_page(
  uuid, timestamptz, timestamptz, text, text, integer, integer
)
from public, anon, authenticated;

grant execute on function public.event_sales_summary(
  uuid, timestamptz, timestamptz, text, text
)
to service_role;

grant execute on function public.event_sales_page(
  uuid, timestamptz, timestamptz, text, text, integer, integer
)
to service_role;

commit;
