-- Girl Pikin For Betteh
-- Phase 16 Finance Scaling 01
-- Create this migration with:
--   supabase migration new finance_reporting_scaling
-- Then place this SQL inside the generated migration file.
--
-- Purpose:
-- 1) exact finance overview totals without client-side row caps
-- 2) server-side paginated finance payment search/filtering
-- 3) exact finance report aggregates
-- 4) explicit three-method reporting: in-app, momo, card
--
-- Security:
-- These RPCs are server-only. They use SECURITY INVOKER and EXECUTE is
-- revoked from PUBLIC/anon/authenticated, then granted only to service_role.

begin;

create index if not exists payments_payment_type_created_idx
  on public.payments(payment_type, created_at desc);

create index if not exists payments_provider_created_idx
  on public.payments(provider, created_at desc);

create index if not exists payments_method_created_idx
  on public.payments((provider_payload ->> 'payment_method'), created_at desc);

create index if not exists payments_paid_at_idx
  on public.payments(paid_at desc)
  where paid_at is not null;

create index if not exists refunds_processed_at_idx
  on public.refunds(processed_at desc)
  where processed_at is not null;

create index if not exists payment_events_reconciliation_attention_idx
  on public.payment_events(received_at desc)
  where processed_at is null or processing_error is not null;

create or replace function public.finance_overview_summary()
returns table (
  succeeded_count bigint,
  pending_count bigint,
  failed_count bigint,
  stale_payment_count bigint,
  unresolved_event_count bigint,
  refund_count bigint,
  volume_by_currency jsonb,
  method_breakdown jsonb
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select
    (select count(*) from public.payments where status = 'succeeded')::bigint,
    (
      select count(*)
      from public.payments
      where status in ('pending', 'processing')
    )::bigint,
    (select count(*) from public.payments where status = 'failed')::bigint,
    (
      select count(*)
      from public.payments
      where status in ('pending', 'processing')
        and created_at < now() - interval '30 minutes'
    )::bigint,
    (
      select count(*)
      from public.payment_events
      where processed_at is null
         or processing_error is not null
    )::bigint,
    (select count(*) from public.refunds)::bigint,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'currency', rows.currency,
            'amount', rows.amount
          )
          order by rows.currency
        )
        from (
          select
            currency,
            sum(amount)::numeric as amount
          from public.payments
          where status = 'succeeded'
          group by currency
        ) rows
      ),
      '[]'::jsonb
    ),
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'payment_method', rows.payment_method,
            'currency', rows.currency,
            'count', rows.payment_count,
            'amount', rows.amount
          )
          order by rows.payment_method, rows.currency
        )
        from (
          select
            case lower(coalesce(provider_payload ->> 'payment_method', ''))
              when 'in-app' then 'in-app'
              when 'momo' then 'momo'
              when 'card' then 'card'
              else 'unknown'
            end as payment_method,
            currency,
            count(*)::bigint as payment_count,
            sum(amount)::numeric as amount
          from public.payments
          where status = 'succeeded'
          group by 1, 2
        ) rows
      ),
      '[]'::jsonb
    );
$$;

create or replace function public.finance_payment_filter_options()
returns table (
  providers jsonb
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select coalesce(
    jsonb_agg(provider order by provider),
    '[]'::jsonb
  )
  from (
    select distinct provider
    from public.payments
    where provider is not null
      and btrim(provider) <> ''
  ) rows;
$$;

create or replace function public.finance_payments_page(
  p_status text default null,
  p_type text default null,
  p_provider text default null,
  p_method text default null,
  p_query text default null,
  p_page integer default 1,
  p_page_size integer default 50
)
returns table (
  id uuid,
  payment_type text,
  vote_order_id uuid,
  ticket_order_id uuid,
  provider text,
  provider_transaction_id text,
  amount numeric,
  currency text,
  status text,
  payer_name text,
  payer_email text,
  payer_phone text,
  payment_method text,
  failure_reason text,
  paid_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  order_number text,
  order_status text,
  delivery_status text,
  delivery_last_error text,
  total_count bigint
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with base as (
    select
      p.id,
      p.payment_type,
      p.vote_order_id,
      p.ticket_order_id,
      p.provider,
      p.provider_transaction_id,
      p.amount,
      p.currency,
      p.status,
      p.payer_name,
      p.payer_email,
      p.payer_phone,
      case lower(coalesce(p.provider_payload ->> 'payment_method', ''))
        when 'in-app' then 'in-app'
        when 'momo' then 'momo'
        when 'card' then 'card'
        else 'unknown'
      end as payment_method,
      p.failure_reason,
      p.paid_at,
      p.created_at,
      p.updated_at,
      coalesce(vo.order_number, tord.order_number, '—') as order_number,
      coalesce(vo.status, tord.status) as order_status,
      tord.delivery_status,
      tord.delivery_last_error
    from public.payments p
    left join public.vote_orders vo
      on vo.id = p.vote_order_id
    left join public.ticket_orders tord
      on tord.id = p.ticket_order_id
  ),
  filtered as (
    select *
    from base b
    where (p_status is null or p_status = '' or b.status = p_status)
      and (p_type is null or p_type = '' or b.payment_type = p_type)
      and (
        p_provider is null
        or p_provider = ''
        or lower(b.provider) = lower(p_provider)
      )
      and (
        p_method is null
        or p_method = ''
        or b.payment_method = p_method
      )
      and (
        p_query is null
        or btrim(p_query) = ''
        or lower(
          concat_ws(
            ' ',
            b.id::text,
            b.order_number,
            coalesce(b.provider_transaction_id, ''),
            coalesce(b.payer_name, ''),
            coalesce(b.payer_email, ''),
            coalesce(b.payer_phone, '')
          )
        ) like '%' || lower(btrim(p_query)) || '%'
      )
  ),
  counted as (
    select
      f.*,
      count(*) over()::bigint as total_count
    from filtered f
  )
  select
    c.id,
    c.payment_type,
    c.vote_order_id,
    c.ticket_order_id,
    c.provider,
    c.provider_transaction_id,
    c.amount,
    c.currency,
    c.status,
    c.payer_name,
    c.payer_email,
    c.payer_phone,
    c.payment_method,
    c.failure_reason,
    c.paid_at,
    c.created_at,
    c.updated_at,
    c.order_number,
    c.order_status,
    c.delivery_status,
    c.delivery_last_error,
    c.total_count
  from counted c
  order by c.created_at desc
  limit least(greatest(coalesce(p_page_size, 50), 1), 100)
  offset (
    greatest(coalesce(p_page, 1), 1) - 1
  ) * least(greatest(coalesce(p_page_size, 50), 1), 100);
$$;

create or replace function public.finance_report_summary(
  p_from timestamptz default null,
  p_to timestamptz default null
)
returns table (
  payment_count bigint,
  refund_count bigint,
  by_currency jsonb,
  by_type jsonb,
  by_method jsonb,
  recent_refunds jsonb
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with paid as (
    select
      p.*,
      case lower(coalesce(p.provider_payload ->> 'payment_method', ''))
        when 'in-app' then 'in-app'
        when 'momo' then 'momo'
        when 'card' then 'card'
        else 'unknown'
      end as payment_method
    from public.payments p
    where p.status in (
      'succeeded',
      'refunded',
      'partially_refunded',
      'reversed'
    )
      and p.paid_at is not null
      and (p_from is null or p.paid_at >= p_from)
      and (p_to is null or p.paid_at <= p_to)
  ),
  refund_period as (
    select
      r.id,
      r.payment_id,
      r.amount,
      r.status,
      r.refund_kind,
      r.processed_at,
      r.created_at,
      p.currency,
      p.payment_type,
      p.provider
    from public.refunds r
    join public.payments p
      on p.id = r.payment_id
    where r.status = 'succeeded'
      and (p_from is null or r.processed_at >= p_from)
      and (p_to is null or r.processed_at <= p_to)
  ),
  gross_currency as (
    select
      currency,
      sum(amount)::numeric as gross
    from paid
    group by currency
  ),
  refund_currency as (
    select
      currency,
      sum(amount)::numeric as refunds
    from refund_period
    group by currency
  ),
  currencies as (
    select currency from gross_currency
    union
    select currency from refund_currency
  ),
  currency_rows as (
    select
      c.currency,
      coalesce(g.gross, 0)::numeric as gross,
      coalesce(r.refunds, 0)::numeric as refunds,
      (coalesce(g.gross, 0) - coalesce(r.refunds, 0))::numeric as net
    from currencies c
    left join gross_currency g using (currency)
    left join refund_currency r using (currency)
  ),
  type_rows as (
    select
      payment_type,
      currency,
      count(*)::bigint as payment_count,
      sum(amount)::numeric as amount
    from paid
    group by payment_type, currency
  ),
  method_rows as (
    select
      payment_method,
      currency,
      count(*)::bigint as payment_count,
      sum(amount)::numeric as amount
    from paid
    group by payment_method, currency
  ),
  recent_refund_rows as (
    select
      id,
      payment_id,
      amount,
      status,
      refund_kind,
      processed_at,
      created_at,
      currency,
      payment_type,
      provider
    from refund_period
    order by processed_at desc nulls last, created_at desc
    limit 10
  )
  select
    (select count(*) from paid)::bigint,
    (select count(*) from refund_period)::bigint,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'currency', r.currency,
            'gross', r.gross,
            'refunds', r.refunds,
            'net', r.net
          )
          order by r.currency
        )
        from currency_rows r
      ),
      '[]'::jsonb
    ),
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'payment_type', r.payment_type,
            'currency', r.currency,
            'count', r.payment_count,
            'amount', r.amount
          )
          order by r.payment_type, r.currency
        )
        from type_rows r
      ),
      '[]'::jsonb
    ),
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'payment_method', r.payment_method,
            'currency', r.currency,
            'count', r.payment_count,
            'amount', r.amount
          )
          order by r.payment_method, r.currency
        )
        from method_rows r
      ),
      '[]'::jsonb
    ),
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', r.id,
            'payment_id', r.payment_id,
            'amount', r.amount,
            'status', r.status,
            'refund_kind', r.refund_kind,
            'processed_at', r.processed_at,
            'created_at', r.created_at,
            'currency', r.currency,
            'payment_type', r.payment_type,
            'provider', r.provider
          )
          order by r.processed_at desc nulls last, r.created_at desc
        )
        from recent_refund_rows r
      ),
      '[]'::jsonb
    );
$$;

-- Server-only RPC access.
revoke all on function public.finance_overview_summary()
  from public, anon, authenticated;
revoke all on function public.finance_payment_filter_options()
  from public, anon, authenticated;
revoke all on function public.finance_payments_page(text, text, text, text, text, integer, integer)
  from public, anon, authenticated;
revoke all on function public.finance_report_summary(timestamptz, timestamptz)
  from public, anon, authenticated;

grant execute on function public.finance_overview_summary()
  to service_role;
grant execute on function public.finance_payment_filter_options()
  to service_role;
grant execute on function public.finance_payments_page(text, text, text, text, text, integer, integer)
  to service_role;
grant execute on function public.finance_report_summary(timestamptz, timestamptz)
  to service_role;

commit;
