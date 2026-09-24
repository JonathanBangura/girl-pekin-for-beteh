-- Girl Pikin For Betteh
-- Phase 16 Finance Scaling 02
-- LIVE SUPABASE / DIRECT GITHUB VERSION
--
-- Run this entire file FIRST in:
-- Supabase Dashboard -> SQL Editor -> New query
--
-- Then create the same file in GitHub at:
-- supabase/migrations/0025_finance_reconciliation_refund_scaling.sql
--
-- This migration only improves Finance read/query scaling.
-- It does NOT charge customers, create refunds, or change payment,
-- vote, ticket, or settlement records.

begin;

create index if not exists vote_ledger_payment_idx
  on public.vote_ledger(payment_id)
  where payment_id is not null;

create index if not exists refunds_payment_status_idx
  on public.refunds(payment_id, status);

create index if not exists refunds_created_at_idx
  on public.refunds(created_at desc);

create index if not exists payments_stale_pending_idx
  on public.payments(created_at desc)
  where status in ('pending', 'processing');

create index if not exists ticket_orders_delivery_failed_idx
  on public.ticket_orders(created_at desc)
  where delivery_status = 'failed';

create or replace function public.finance_reconciliation_page(
  p_page integer default 1,
  p_page_size integer default 50
)
returns table (
  critical_count bigint,
  warning_count bigint,
  total_count bigint,
  cases jsonb
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with ticket_expected as (
    select
      toi.ticket_order_id,
      sum(
        toi.quantity * toi.admissions_per_unit
      )::bigint as expected
    from public.ticket_order_items toi
    group by toi.ticket_order_id
  ),
  ticket_issued as (
    select
      t.ticket_order_id,
      count(*)::bigint as issued
    from public.tickets t
    group by t.ticket_order_id
  ),
  all_cases as (
    select
      ('event:' || pe.id::text)::text as key,
      'critical'::text as severity,
      'webhook'::text as kind,
      'Completed Vult webhook needs reprocessing'::text as title,
      coalesce(
        pe.processing_error,
        'Provider completion was received but the event was not marked processed.'
      )::text as detail,
      pe.payment_id,
      pe.id::bigint as payment_event_id,
      coalesce(
        vo.order_number,
        tord.order_number
      )::text as order_number,
      pe.received_at as created_at,
      (pe.payment_id is not null) as can_reprocess_event,
      false as can_repair_payment
    from public.payment_events pe
    left join public.payments p
      on p.id = pe.payment_id
    left join public.vote_orders vo
      on vo.id = p.vote_order_id
    left join public.ticket_orders tord
      on tord.id = p.ticket_order_id
    where pe.event_type = 'completed'
      and (
        pe.processed_at is null
        or pe.processing_error is not null
      )

    union all

    select
      ('vote:' || p.id::text)::text as key,
      'critical'::text as severity,
      'vote_settlement'::text as kind,
      'Successful vote payment is not fully settled'::text as title,
      case
        when vo.status is distinct from 'paid'
          then 'The payment succeeded but the vote order is not marked paid.'
        else 'The payment succeeded but its vote-ledger entry is missing.'
      end::text as detail,
      p.id as payment_id,
      null::bigint as payment_event_id,
      vo.order_number::text as order_number,
      coalesce(p.paid_at, p.created_at) as created_at,
      false as can_reprocess_event,
      true as can_repair_payment
    from public.payments p
    left join public.vote_orders vo
      on vo.id = p.vote_order_id
    where p.status = 'succeeded'
      and p.payment_type = 'vote'
      and p.vote_order_id is not null
      and (
        vo.status is distinct from 'paid'
        or not exists (
          select 1
          from public.vote_ledger vl
          where vl.payment_id = p.id
        )
      )

    union all

    select
      ('ticket-settlement:' || p.id::text)::text as key,
      'critical'::text as severity,
      'ticket_settlement'::text as kind,
      'Successful ticket payment is not fully settled'::text as title,
      'The payment succeeded but the ticket order is not marked paid.'::text as detail,
      p.id as payment_id,
      null::bigint as payment_event_id,
      tord.order_number::text as order_number,
      coalesce(p.paid_at, p.created_at) as created_at,
      false as can_reprocess_event,
      true as can_repair_payment
    from public.payments p
    left join public.ticket_orders tord
      on tord.id = p.ticket_order_id
    where p.status = 'succeeded'
      and p.payment_type = 'ticket'
      and p.ticket_order_id is not null
      and tord.status is distinct from 'paid'

    union all

    select
      ('ticket-issuance:' || p.id::text)::text as key,
      'critical'::text as severity,
      'ticket_issuance'::text as kind,
      'Paid ticket order has an issuance mismatch'::text as title,
      format(
        'Expected %s individual ticket(s), but %s were issued.',
        coalesce(te.expected, 0),
        coalesce(ti.issued, 0)
      )::text as detail,
      p.id as payment_id,
      null::bigint as payment_event_id,
      tord.order_number::text as order_number,
      coalesce(p.paid_at, p.created_at) as created_at,
      false as can_reprocess_event,
      true as can_repair_payment
    from public.payments p
    join public.ticket_orders tord
      on tord.id = p.ticket_order_id
    left join ticket_expected te
      on te.ticket_order_id = p.ticket_order_id
    left join ticket_issued ti
      on ti.ticket_order_id = p.ticket_order_id
    where p.status = 'succeeded'
      and p.payment_type = 'ticket'
      and p.ticket_order_id is not null
      and tord.status = 'paid'
      and coalesce(te.expected, 0) > 0
      and coalesce(te.expected, 0)
        <> coalesce(ti.issued, 0)

    union all

    select
      ('ticket-delivery:' || p.id::text)::text as key,
      'warning'::text as severity,
      'ticket_delivery'::text as kind,
      'Ticket email delivery failed'::text as title,
      coalesce(
        tord.delivery_last_error,
        'The paid order is valid but its email delivery failed.'
      )::text as detail,
      p.id as payment_id,
      null::bigint as payment_event_id,
      tord.order_number::text as order_number,
      coalesce(p.paid_at, p.created_at) as created_at,
      false as can_reprocess_event,
      true as can_repair_payment
    from public.payments p
    join public.ticket_orders tord
      on tord.id = p.ticket_order_id
    where p.status = 'succeeded'
      and p.payment_type = 'ticket'
      and p.ticket_order_id is not null
      and tord.delivery_status = 'failed'

    union all

    select
      ('stale:' || p.id::text)::text as key,
      'warning'::text as severity,
      'stale_payment'::text as kind,
      'Payment has been pending for more than 30 minutes'::text as title,
      coalesce(
        p.failure_reason,
        'No confirmed successful settlement has been recorded. Review before taking any manual action.'
      )::text as detail,
      p.id as payment_id,
      null::bigint as payment_event_id,
      coalesce(
        vo.order_number,
        tord.order_number
      )::text as order_number,
      p.created_at as created_at,
      false as can_reprocess_event,
      false as can_repair_payment
    from public.payments p
    left join public.vote_orders vo
      on vo.id = p.vote_order_id
    left join public.ticket_orders tord
      on tord.id = p.ticket_order_id
    where p.status in ('pending', 'processing')
      and p.created_at < now() - interval '30 minutes'
  ),
  paged as (
    select *
    from all_cases
    order by
      case when severity = 'critical' then 0 else 1 end,
      created_at desc,
      key
    limit least(
      greatest(coalesce(p_page_size, 50), 1),
      100
    )
    offset (
      greatest(coalesce(p_page, 1), 1) - 1
    ) * least(
      greatest(coalesce(p_page_size, 50), 1),
      100
    )
  )
  select
    (
      select count(*)
      from all_cases
      where severity = 'critical'
    )::bigint,
    (
      select count(*)
      from all_cases
      where severity = 'warning'
    )::bigint,
    (select count(*) from all_cases)::bigint,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'key', c.key,
            'severity', c.severity,
            'kind', c.kind,
            'title', c.title,
            'detail', c.detail,
            'payment_id', c.payment_id,
            'payment_event_id', c.payment_event_id,
            'order_number', c.order_number,
            'created_at', c.created_at,
            'can_reprocess_event', c.can_reprocess_event,
            'can_repair_payment', c.can_repair_payment
          )
          order by
            case
              when c.severity = 'critical'
                then 0
              else 1
            end,
            c.created_at desc,
            c.key
        )
        from paged c
      ),
      '[]'::jsonb
    );
$$;

create or replace function public.finance_refund_management_page(
  p_payment_query text default null,
  p_refund_page integer default 1,
  p_refund_page_size integer default 50,
  p_payment_limit integer default 25
)
returns table (
  eligible_payment_count bigint,
  eligible_payments jsonb,
  refund_count bigint,
  refund_page integer,
  refund_page_size integer,
  refunds jsonb
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with eligible_base as (
    select
      p.id,
      p.payment_type,
      p.provider,
      p.provider_transaction_id,
      p.amount,
      p.currency,
      p.status,
      p.payer_name,
      p.payer_email,
      p.payer_phone,
      p.paid_at,
      p.created_at,
      coalesce(
        vo.order_number,
        tord.order_number,
        '—'
      )::text as order_number,
      coalesce(
        vo.status,
        tord.status
      )::text as order_status,
      case lower(
        coalesce(
          p.provider_payload ->> 'payment_method',
          ''
        )
      )
        when 'in-app' then 'in-app'
        when 'momo' then 'momo'
        when 'card' then 'card'
        else 'unknown'
      end::text as payment_method
    from public.payments p
    left join public.vote_orders vo
      on vo.id = p.vote_order_id
    left join public.ticket_orders tord
      on tord.id = p.ticket_order_id
    where p.status = 'succeeded'
      and not exists (
        select 1
        from public.refunds r
        where r.payment_id = p.id
          and r.status = 'succeeded'
      )
      and (
        p.payment_type = 'donation'
        or (
          p.payment_type = 'vote'
          and vo.status = 'paid'
        )
        or (
          p.payment_type = 'ticket'
          and tord.status = 'paid'
        )
      )
  ),
  eligible_filtered as (
    select *
    from eligible_base e
    where
      p_payment_query is null
      or btrim(p_payment_query) = ''
      or lower(
        concat_ws(
          ' ',
          e.id::text,
          e.order_number,
          coalesce(e.provider_transaction_id, ''),
          coalesce(e.payer_name, ''),
          coalesce(e.payer_email, ''),
          coalesce(e.payer_phone, ''),
          coalesce(e.provider, ''),
          e.payment_type
        )
      ) like '%' || lower(btrim(p_payment_query)) || '%'
  ),
  eligible_limited as (
    select *
    from eligible_filtered
    order by
      paid_at desc nulls last,
      created_at desc,
      id
    limit least(
      greatest(coalesce(p_payment_limit, 25), 1),
      50
    )
  ),
  refund_base as (
    select
      r.id,
      r.payment_id,
      r.amount,
      r.reason,
      r.provider_refund_id,
      r.status,
      r.requested_by,
      r.processed_at,
      r.created_at,
      r.refund_kind,
      r.external_method,
      r.notes,
      r.completed_by,
      r.provider_confirmed_at,
      p.payment_type,
      p.provider,
      p.currency,
      p.payer_name,
      coalesce(
        vo.order_number,
        tord.order_number,
        '—'
      )::text as order_number
    from public.refunds r
    join public.payments p
      on p.id = r.payment_id
    left join public.vote_orders vo
      on vo.id = p.vote_order_id
    left join public.ticket_orders tord
      on tord.id = p.ticket_order_id
  ),
  refund_paged as (
    select *
    from refund_base
    order by created_at desc, id
    limit least(
      greatest(coalesce(p_refund_page_size, 50), 1),
      100
    )
    offset (
      greatest(coalesce(p_refund_page, 1), 1) - 1
    ) * least(
      greatest(coalesce(p_refund_page_size, 50), 1),
      100
    )
  )
  select
    (select count(*) from eligible_filtered)::bigint,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', e.id,
            'payment_type', e.payment_type,
            'provider', e.provider,
            'provider_transaction_id', e.provider_transaction_id,
            'amount', e.amount,
            'currency', e.currency,
            'status', e.status,
            'payer_name', e.payer_name,
            'payer_email', e.payer_email,
            'payer_phone', e.payer_phone,
            'paid_at', e.paid_at,
            'created_at', e.created_at,
            'order_number', e.order_number,
            'order_status', e.order_status,
            'payment_method', e.payment_method
          )
          order by
            e.paid_at desc nulls last,
            e.created_at desc,
            e.id
        )
        from eligible_limited e
      ),
      '[]'::jsonb
    ),
    (select count(*) from refund_base)::bigint,
    greatest(
      coalesce(p_refund_page, 1),
      1
    )::integer,
    least(
      greatest(coalesce(p_refund_page_size, 50), 1),
      100
    )::integer,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', r.id,
            'payment_id', r.payment_id,
            'amount', r.amount,
            'reason', r.reason,
            'provider_refund_id', r.provider_refund_id,
            'status', r.status,
            'requested_by', r.requested_by,
            'processed_at', r.processed_at,
            'created_at', r.created_at,
            'refund_kind', r.refund_kind,
            'external_method', r.external_method,
            'notes', r.notes,
            'completed_by', r.completed_by,
            'provider_confirmed_at', r.provider_confirmed_at,
            'payment_type', r.payment_type,
            'provider', r.provider,
            'currency', r.currency,
            'payer_name', r.payer_name,
            'order_number', r.order_number
          )
          order by r.created_at desc, r.id
        )
        from refund_paged r
      ),
      '[]'::jsonb
    );
$$;

revoke all
on function public.finance_reconciliation_page(
  integer,
  integer
)
from public, anon, authenticated;

revoke all
on function public.finance_refund_management_page(
  text,
  integer,
  integer,
  integer
)
from public, anon, authenticated;

grant execute
on function public.finance_reconciliation_page(
  integer,
  integer
)
to service_role;

grant execute
on function public.finance_refund_management_page(
  text,
  integer,
  integer,
  integer
)
to service_role;

commit;
