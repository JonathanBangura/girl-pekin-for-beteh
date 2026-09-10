-- 0007_vult_payment_gateway.sql
-- Shared Vult payment integration for vote and ticket orders.
-- Based on the supplied merchant API:
--   POST /merchants/private/v1/payment-links
--   RSA-4096 / SHA-512 / PSS / Base64 request signature
--   Basic-authenticated webhook with completed|failed statuses.

begin;

-- Public, PII-free payment status for the new Vult payment status page.
create or replace function public.get_public_vult_payment_status(
  p_order_kind text,
  p_public_token uuid
)
returns table (
  order_kind text,
  order_number text,
  order_status text,
  payment_status text,
  payment_method text,
  payment_link text,
  payment_code text,
  last_attempt_status text,
  total_amount numeric,
  currency text,
  reference_name text,
  reference_code text,
  issued_tickets bigint,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_order_kind = 'vote' then
    return query
    select
      'vote'::text,
      o.order_number,
      o.status,
      coalesce(p.status, 'pending'),
      p.provider_payload->>'payment_method',
      p.provider_payload->>'link',
      p.provider_payload->>'code',
      p.provider_payload->>'last_webhook_status',
      o.total_amount,
      o.currency,
      n.full_name,
      n.nominee_code,
      null::bigint,
      o.created_at
    from public.vote_orders o
    join public.nominees n on n.id = o.nominee_id
    left join lateral (
      select p2.status, p2.provider_payload
      from public.payments p2
      where p2.vote_order_id = o.id
        and p2.provider = 'vult'
      order by p2.created_at desc
      limit 1
    ) p on true
    where o.public_token = p_public_token
    limit 1;

    return;
  end if;

  if p_order_kind = 'ticket' then
    return query
    select
      'ticket'::text,
      o.order_number,
      o.status,
      coalesce(p.status, 'pending'),
      p.provider_payload->>'payment_method',
      p.provider_payload->>'link',
      p.provider_payload->>'code',
      p.provider_payload->>'last_webhook_status',
      o.total_amount,
      o.currency,
      e.title,
      e.slug,
      (
        select count(*)
        from public.tickets t
        where t.ticket_order_id = o.id
          and t.status = 'active'
      )::bigint,
      o.created_at
    from public.ticket_orders o
    join public.events e on e.id = o.event_id
    left join lateral (
      select p2.status, p2.provider_payload
      from public.payments p2
      where p2.ticket_order_id = o.id
        and p2.provider = 'vult'
      order by p2.created_at desc
      limit 1
    ) p on true
    where o.public_token = p_public_token
    limit 1;

    return;
  end if;
end;
$$;

grant execute on function public.get_public_vult_payment_status(text, uuid)
to anon, authenticated;

-- Ticket payment acknowledgement intentionally does not issue QR tickets yet.
-- Phase 6B can run the existing settle_ticket_payment_success(...) issuance
-- function after QR delivery/email handling is connected.
create or replace function public.mark_ticket_payment_success(
  p_payment_id uuid,
  p_provider_transaction_id text,
  p_provider_payload jsonb default '{}'::jsonb,
  p_paid_at timestamptz default now()
)
returns table (
  ticket_order_id uuid,
  order_number text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.payments%rowtype;
  v_order public.ticket_orders%rowtype;
begin
  select *
  into v_payment
  from public.payments
  where id = p_payment_id
  for update;

  if not found then
    raise exception 'Payment % not found', p_payment_id;
  end if;

  if v_payment.payment_type <> 'ticket'
     or v_payment.ticket_order_id is null then
    raise exception 'Payment % is not a ticket payment', p_payment_id;
  end if;

  if v_payment.status in ('refunded', 'partially_refunded', 'reversed') then
    raise exception 'Payment % cannot be settled from status %',
      p_payment_id, v_payment.status;
  end if;

  select *
  into v_order
  from public.ticket_orders
  where id = v_payment.ticket_order_id
  for update;

  if not found then
    raise exception 'Ticket order not found';
  end if;

  if v_payment.amount <> v_order.total_amount
     or v_payment.currency <> v_order.currency then
    raise exception 'Payment amount/currency does not match ticket order';
  end if;

  update public.payments
  set
    provider_transaction_id = coalesce(
      p_provider_transaction_id,
      provider_transaction_id
    ),
    provider_payload = coalesce(provider_payload, '{}'::jsonb)
      || coalesce(p_provider_payload, '{}'::jsonb),
    status = 'succeeded',
    paid_at = coalesce(p_paid_at, now()),
    failure_reason = null,
    updated_at = now()
  where id = p_payment_id;

  update public.ticket_orders
  set
    status = 'paid',
    updated_at = now()
  where id = v_order.id;

  return query
  select v_order.id, v_order.order_number;
end;
$$;

revoke all on function public.mark_ticket_payment_success(
  uuid, text, jsonb, timestamptz
) from public, anon, authenticated;

grant execute on function public.mark_ticket_payment_success(
  uuid, text, jsonb, timestamptz
) to service_role;

commit;
