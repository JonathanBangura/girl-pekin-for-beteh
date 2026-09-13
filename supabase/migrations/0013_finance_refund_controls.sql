-- 0013_finance_refund_controls.sql
-- Controlled recording of externally completed full refunds/reversals.
--
-- The supplied Vult merchant OpenAPI documents payment-link creation but does
-- not document a merchant refund endpoint. This migration therefore does not
-- attempt a Vult refund. It records a refund/reversal only after Finance
-- confirms the money movement outside the platform.

begin;

alter table public.refunds
  add column if not exists refund_kind text not null default 'refund'
    check (refund_kind in ('refund', 'reversal')),
  add column if not exists external_method text,
  add column if not exists notes text,
  add column if not exists completed_by uuid
    references public.profiles(id) on delete set null,
  add column if not exists provider_confirmed_at timestamptz;

create or replace function public.record_external_full_refund(
  p_payment_id uuid,
  p_refund_kind text,
  p_provider_refund_id text,
  p_external_method text,
  p_reason text,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_payment public.payments%rowtype;
  v_vote_order public.vote_orders%rowtype;
  v_ticket_order public.ticket_orders%rowtype;
  v_refund_id uuid;
  v_existing_refund uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  if not public.has_permission('finance.manage') then
    raise exception 'Finance permission required'
      using errcode = '42501';
  end if;

  if p_refund_kind not in ('refund', 'reversal') then
    raise exception 'Invalid refund kind';
  end if;

  if nullif(trim(coalesce(p_provider_refund_id, '')), '') is null then
    raise exception 'External/provider confirmation reference is required';
  end if;

  if nullif(trim(coalesce(p_external_method, '')), '') is null then
    raise exception 'External refund method is required';
  end if;

  if nullif(trim(coalesce(p_reason, '')), '') is null then
    raise exception 'Refund reason is required';
  end if;

  select *
    into v_payment
  from public.payments
  where id = p_payment_id
  for update;

  if not found then
    raise exception 'Payment % not found', p_payment_id;
  end if;

  if v_payment.status <> 'succeeded' then
    raise exception
      'Only a succeeded payment can be recorded as externally refunded/reversed; current status is %',
      v_payment.status;
  end if;

  select id
    into v_existing_refund
  from public.refunds
  where payment_id = p_payment_id
    and status = 'succeeded'
  limit 1;

  if v_existing_refund is not null then
    raise exception
      'A successful refund/reversal already exists for payment %',
      p_payment_id;
  end if;

  if v_payment.payment_type = 'vote' then
    select *
      into v_vote_order
    from public.vote_orders
    where id = v_payment.vote_order_id
    for update;

    if not found or v_vote_order.status <> 'paid' then
      raise exception
        'Vote order must be fully settled before refund/reversal';
    end if;

    if not exists (
      select 1
      from public.vote_ledger vl
      where vl.payment_id = v_payment.id
        and vl.entry_type = 'payment'
        and vl.quantity_delta > 0
    ) then
      raise exception
        'Vote ledger allocation is missing; reconcile the payment before refund/reversal';
    end if;

  elsif v_payment.payment_type = 'ticket' then
    select *
      into v_ticket_order
    from public.ticket_orders
    where id = v_payment.ticket_order_id
    for update;

    if not found or v_ticket_order.status <> 'paid' then
      raise exception
        'Ticket order must be fully settled before refund/reversal';
    end if;
  end if;

  insert into public.refunds (
    payment_id,
    amount,
    reason,
    provider_refund_id,
    status,
    requested_by,
    processed_at,
    refund_kind,
    external_method,
    notes,
    completed_by,
    provider_confirmed_at
  )
  values (
    v_payment.id,
    v_payment.amount,
    trim(p_reason),
    trim(p_provider_refund_id),
    'succeeded',
    v_user_id,
    now(),
    p_refund_kind,
    trim(p_external_method),
    nullif(trim(coalesce(p_notes, '')), ''),
    v_user_id,
    now()
  )
  returning id into v_refund_id;

  update public.payments
  set
    status = case
      when p_refund_kind = 'reversal' then 'reversed'
      else 'refunded'
    end,
    updated_at = now()
  where id = v_payment.id;

  if v_payment.payment_type = 'vote' then
    update public.vote_orders
    set status = 'refunded', updated_at = now()
    where id = v_vote_order.id;

    insert into public.vote_ledger (
      nominee_id,
      vote_order_id,
      payment_id,
      entry_type,
      quantity_delta,
      source_key,
      reason,
      created_by
    )
    values (
      v_vote_order.nominee_id,
      v_vote_order.id,
      v_payment.id,
      case
        when p_refund_kind = 'reversal' then 'reversal'
        else 'refund'
      end,
      -v_vote_order.quantity,
      'finance-' || p_refund_kind || ':' || v_refund_id::text,
      trim(p_reason),
      v_user_id
    );

  elsif v_payment.payment_type = 'ticket' then
    update public.ticket_orders
    set status = 'refunded', updated_at = now()
    where id = v_ticket_order.id;

    update public.tickets
    set status = 'refunded', updated_at = now()
    where ticket_order_id = v_ticket_order.id
      and status <> 'refunded';
  end if;

  insert into public.audit_logs (
    actor_user_id,
    action,
    entity_type,
    entity_id,
    old_data,
    new_data,
    metadata
  )
  values (
    v_user_id,
    'external_full_' || p_refund_kind || '_recorded',
    'refund',
    v_refund_id,
    null,
    jsonb_build_object(
      'payment_id', v_payment.id,
      'payment_type', v_payment.payment_type,
      'amount', v_payment.amount,
      'currency', v_payment.currency,
      'provider_reference', trim(p_provider_refund_id),
      'external_method', trim(p_external_method),
      'reason', trim(p_reason)
    ),
    jsonb_build_object(
      'money_movement', 'confirmed_external',
      'provider_api_called', false
    )
  );

  return v_refund_id;
end;
$$;

revoke all on function public.record_external_full_refund(
  uuid, text, text, text, text, text
) from public, anon;

grant execute on function public.record_external_full_refund(
  uuid, text, text, text, text, text
) to authenticated;

commit;
