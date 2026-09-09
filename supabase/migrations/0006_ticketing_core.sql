-- 0006_ticketing_core.sql
-- Ticketing foundation: opaque public order tokens, atomic reservations,
-- provider-safe settlement, and one QR token per admission.

begin;

alter table public.ticket_orders
  add column if not exists public_token uuid not null default gen_random_uuid();

create unique index if not exists ticket_orders_public_token_unique
  on public.ticket_orders(public_token);

create unique index if not exists tickets_item_sequence_unique
  on public.tickets(ticket_order_item_id, admission_sequence);

create or replace function public.get_public_ticket_order_status(
  p_public_token uuid
)
returns table (
  order_number text,
  order_status text,
  event_slug text,
  event_title text,
  ticket_type_name text,
  quantity integer,
  admissions integer,
  total_amount numeric,
  currency text,
  payment_status text,
  issued_tickets bigint,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    o.order_number,
    o.status,
    e.slug,
    e.title,
    i.ticket_type_name,
    i.quantity,
    i.quantity * i.admissions_per_unit,
    o.total_amount,
    o.currency,
    coalesce(
      p.status,
      case when o.total_amount = 0 then 'not_required' else 'pending' end
    ),
    (
      select count(*)
      from public.tickets t
      where t.ticket_order_id = o.id
        and t.status = 'active'
    )::bigint,
    o.created_at
  from public.ticket_orders o
  join public.events e on e.id = o.event_id
  join lateral (
    select i2.*
    from public.ticket_order_items i2
    where i2.ticket_order_id = o.id
    order by i2.created_at
    limit 1
  ) i on true
  left join lateral (
    select p2.status
    from public.payments p2
    where p2.ticket_order_id = o.id
    order by p2.created_at desc
    limit 1
  ) p on true
  where o.public_token = p_public_token
  limit 1;
$$;

grant execute on function public.get_public_ticket_order_status(uuid)
to anon, authenticated;

create or replace function public.create_ticket_order_reservation(
  p_event_slug text,
  p_ticket_type_id uuid,
  p_quantity integer,
  p_donation_per_ticket numeric,
  p_purchaser_name text,
  p_purchaser_email text,
  p_purchaser_phone text
)
returns table (
  ticket_order_id uuid,
  payment_id uuid,
  order_number text,
  public_token uuid,
  unit_amount numeric,
  total_amount numeric,
  currency text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.events%rowtype;
  v_type public.ticket_types%rowtype;
  v_order_id uuid;
  v_payment_id uuid;
  v_order_number text;
  v_public_token uuid;
  v_unit_amount numeric(14,2);
  v_total_amount numeric(14,2);
  v_reserved_type bigint;
  v_reserved_event bigint;
  v_admissions bigint;
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Ticket quantity must be greater than zero';
  end if;

  if nullif(trim(coalesce(p_purchaser_name, '')), '') is null then
    raise exception 'Purchaser name is required';
  end if;

  if nullif(trim(coalesce(p_purchaser_email, '')), '') is null
     and nullif(trim(coalesce(p_purchaser_phone, '')), '') is null then
    raise exception 'Email or phone number is required';
  end if;

  select *
  into v_event
  from public.events
  where slug = p_event_slug
  for update;

  if not found
     or v_event.is_public is not true
     or v_event.status <> 'published'
     or v_event.access_type <> 'paid' then
    raise exception 'Event is not available for paid ticket sales';
  end if;

  select *
  into v_type
  from public.ticket_types
  where id = p_ticket_type_id
    and event_id = v_event.id
  for update;

  if not found or v_type.is_active is not true then
    raise exception 'Ticket type is not available';
  end if;

  if v_type.sales_starts_at is not null and now() < v_type.sales_starts_at then
    raise exception 'Ticket sales have not started';
  end if;

  if v_type.sales_ends_at is not null and now() > v_type.sales_ends_at then
    raise exception 'Ticket sales have ended';
  end if;

  if v_type.max_per_order is not null and p_quantity > v_type.max_per_order then
    raise exception 'Maximum quantity per order is %', v_type.max_per_order;
  end if;

  if v_type.pricing_type = 'fixed' then
    v_unit_amount := v_type.price;
  elsif v_type.pricing_type = 'donation' then
    if p_donation_per_ticket is null
       or p_donation_per_ticket < coalesce(v_type.min_donation, 0)
       or p_donation_per_ticket <= 0 then
      raise exception 'Donation per ticket is below the configured minimum';
    end if;
    v_unit_amount := p_donation_per_ticket;
  elsif v_type.pricing_type = 'free' then
    raise exception 'Free registration ticketing uses a separate workflow';
  else
    raise exception 'Unsupported pricing type';
  end if;

  v_admissions := p_quantity * v_type.admissions_per_unit;

  select coalesce(sum(i.quantity * i.admissions_per_unit), 0)
  into v_reserved_type
  from public.ticket_order_items i
  join public.ticket_orders o on o.id = i.ticket_order_id
  where i.ticket_type_id = v_type.id
    and (
      o.status = 'paid'
      or (
        o.status in ('pending', 'payment_pending')
        and (o.expires_at is null or o.expires_at > now())
      )
    );

  if v_type.capacity is not null
     and v_reserved_type + v_admissions > v_type.capacity then
    raise exception 'Not enough capacity remaining for this ticket type';
  end if;

  select coalesce(sum(i.quantity * i.admissions_per_unit), 0)
  into v_reserved_event
  from public.ticket_order_items i
  join public.ticket_orders o on o.id = i.ticket_order_id
  where o.event_id = v_event.id
    and (
      o.status = 'paid'
      or (
        o.status in ('pending', 'payment_pending')
        and (o.expires_at is null or o.expires_at > now())
      )
    );

  if v_event.capacity is not null
     and v_reserved_event + v_admissions > v_event.capacity then
    raise exception 'Not enough event capacity remaining';
  end if;

  v_order_id := gen_random_uuid();
  v_public_token := gen_random_uuid();
  v_order_number :=
    'ORD-' ||
    to_char(coalesce(v_event.starts_at, now()), 'YY') ||
    '-' ||
    upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 10));

  v_total_amount := v_unit_amount * p_quantity;

  insert into public.ticket_orders (
    id, order_number, public_token, event_id,
    purchaser_name, purchaser_email, purchaser_phone,
    subtotal, total_amount, currency, status, expires_at
  )
  values (
    v_order_id, v_order_number, v_public_token, v_event.id,
    trim(p_purchaser_name),
    nullif(trim(coalesce(p_purchaser_email, '')), ''),
    nullif(trim(coalesce(p_purchaser_phone, '')), ''),
    v_total_amount, v_total_amount, v_type.currency,
    'pending', now() + interval '30 minutes'
  );

  insert into public.ticket_order_items (
    ticket_order_id, ticket_type_id, ticket_type_name, pricing_type,
    quantity, admissions_per_unit, unit_amount
  )
  values (
    v_order_id, v_type.id, v_type.name, v_type.pricing_type,
    p_quantity, v_type.admissions_per_unit, v_unit_amount
  );

  insert into public.payments (
    payment_type, ticket_order_id, provider, idempotency_key,
    amount, currency, status,
    payer_name, payer_email, payer_phone, provider_payload
  )
  values (
    'ticket', v_order_id, 'vult', 'ticket:' || v_order_id::text,
    v_total_amount, v_type.currency, 'pending',
    trim(p_purchaser_name),
    nullif(trim(coalesce(p_purchaser_email, '')), ''),
    nullif(trim(coalesce(p_purchaser_phone, '')), ''),
    jsonb_build_object('integration_status', 'adapter_pending')
  )
  returning id into v_payment_id;

  return query
  select
    v_order_id, v_payment_id, v_order_number, v_public_token,
    v_unit_amount, v_total_amount, v_type.currency;
end;
$$;

revoke all on function public.create_ticket_order_reservation(
  text, uuid, integer, numeric, text, text, text
) from public, anon, authenticated;

grant execute on function public.create_ticket_order_reservation(
  text, uuid, integer, numeric, text, text, text
) to service_role;

create or replace function public.settle_ticket_payment_success(
  p_payment_id uuid,
  p_provider_transaction_id text,
  p_provider_payload jsonb default '{}'::jsonb,
  p_paid_at timestamptz default now()
)
returns table (
  ticket_id uuid,
  ticket_code text,
  qr_token text,
  ticket_type_name text,
  admission_sequence integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.payments%rowtype;
  v_order public.ticket_orders%rowtype;
  v_event public.events%rowtype;
  v_item public.ticket_order_items%rowtype;
  v_sequence integer;
  v_total_admissions integer;
  v_token text;
  v_ticket_code text;
  v_ticket_id uuid;
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

  select *
  into v_event
  from public.events
  where id = v_order.event_id;

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
  set status = 'paid', updated_at = now()
  where id = v_order.id;

  for v_item in
    select *
    from public.ticket_order_items
    where ticket_order_id = v_order.id
    order by created_at
  loop
    v_total_admissions := v_item.quantity * v_item.admissions_per_unit;

    for v_sequence in 1..v_total_admissions loop
      if not exists (
        select 1
        from public.tickets t
        where t.ticket_order_item_id = v_item.id
          and t.admission_sequence = v_sequence
      ) then
        v_token := encode(gen_random_bytes(32), 'hex');
        v_ticket_code :=
          'TKT-' ||
          to_char(coalesce(v_event.starts_at, now()), 'YY') ||
          '-' ||
          upper(substr(encode(gen_random_bytes(7), 'hex'), 1, 12));

        insert into public.tickets (
          ticket_order_id, ticket_order_item_id, event_id, ticket_type_id,
          ticket_code, qr_token_hash, status, admission_sequence
        )
        values (
          v_order.id, v_item.id, v_order.event_id, v_item.ticket_type_id,
          v_ticket_code, encode(digest(v_token, 'sha256'), 'hex'),
          'active', v_sequence
        )
        returning id into v_ticket_id;

        ticket_id := v_ticket_id;
        ticket_code := v_ticket_code;
        qr_token := v_token;
        ticket_type_name := v_item.ticket_type_name;
        admission_sequence := v_sequence;
        return next;
      end if;
    end loop;
  end loop;
end;
$$;

revoke all on function public.settle_ticket_payment_success(
  uuid, text, jsonb, timestamptz
) from public, anon, authenticated;

grant execute on function public.settle_ticket_payment_success(
  uuid, text, jsonb, timestamptz
) to service_role;

commit;
