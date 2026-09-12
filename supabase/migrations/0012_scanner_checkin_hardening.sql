-- 0012_scanner_checkin_hardening.sql
-- Forces all check-ins through the validated atomic RPC and redacts
-- information when a ticket belongs to another event.

begin;

-- Direct inserts were allowed by the original ticketing migration.
-- They could bypass payment/status/event validation. Phase 6C must use
-- the security-definer RPC only.
drop policy if exists checkins_officer_insert
  on public.ticket_checkins;

revoke insert, update, delete
on table public.ticket_checkins
from anon, authenticated;

create or replace function public.check_in_ticket(
  p_event_id uuid,
  p_qr_token_hash text default null,
  p_ticket_code text default null,
  p_device_label text default null
)
returns table (
  result_code text,
  result_message text,
  ticket_id uuid,
  ticket_code text,
  ticket_status text,
  holder_name text,
  ticket_type_name text,
  order_number text,
  checked_in_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_event public.events%rowtype;
  v_ticket public.tickets%rowtype;
  v_order public.ticket_orders%rowtype;
  v_item public.ticket_order_items%rowtype;
  v_existing_checkin public.ticket_checkins%rowtype;
  v_new_checkin public.ticket_checkins%rowtype;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  if not (
    public.has_permission('checkin.use', 'event', p_event_id)
    or public.has_permission('events.manage', 'event', p_event_id)
  ) then
    raise exception 'Not authorized for this event'
      using errcode = '42501';
  end if;

  select *
    into v_event
  from public.events
  where id = p_event_id;

  if not found
     or v_event.status not in ('published', 'sales_closed') then
    return query select
      'event_unavailable'::text,
      'This event is not open for check-in.'::text,
      null::uuid, null::text, null::text, null::text,
      null::text, null::text, null::timestamptz;
    return;
  end if;

  if nullif(trim(coalesce(p_qr_token_hash, '')), '') is null
     and nullif(trim(coalesce(p_ticket_code, '')), '') is null then
    return query select
      'invalid'::text,
      'No ticket credential was supplied.'::text,
      null::uuid, null::text, null::text, null::text,
      null::text, null::text, null::timestamptz;
    return;
  end if;

  if nullif(trim(coalesce(p_qr_token_hash, '')), '') is not null then
    select *
      into v_ticket
    from public.tickets
    where qr_token_hash = trim(p_qr_token_hash)
    limit 1
    for update;
  else
    select *
      into v_ticket
    from public.tickets
    where upper(ticket_code) = upper(trim(p_ticket_code))
    limit 1
    for update;
  end if;

  if not found then
    return query select
      'invalid'::text,
      'Ticket not found.'::text,
      null::uuid, null::text, null::text, null::text,
      null::text, null::text, null::timestamptz;
    return;
  end if;

  -- A scoped officer may learn that the scanned credential is for a different
  -- event, but must not receive that other event's guest/order details.
  if v_ticket.event_id <> p_event_id then
    return query select
      'wrong_event'::text,
      'This ticket belongs to a different event.'::text,
      null::uuid, null::text, null::text, null::text,
      null::text, null::text, null::timestamptz;
    return;
  end if;

  select *
    into v_item
  from public.ticket_order_items
  where id = v_ticket.ticket_order_item_id;

  select *
    into v_order
  from public.ticket_orders
  where id = v_ticket.ticket_order_id;

  if v_ticket.status <> 'active' then
    return query select
      case v_ticket.status
        when 'cancelled' then 'cancelled'
        when 'refunded' then 'refunded'
        when 'reissued' then 'reissued'
        else 'invalid'
      end::text,
      case v_ticket.status
        when 'cancelled' then 'This ticket has been cancelled.'
        when 'refunded' then 'This ticket has been refunded.'
        when 'reissued' then 'This ticket has been replaced by a newer ticket.'
        else 'This ticket is not active.'
      end::text,
      v_ticket.id,
      v_ticket.ticket_code,
      v_ticket.status,
      v_ticket.holder_name,
      coalesce(v_item.ticket_type_name, 'Event Ticket'),
      v_order.order_number,
      null::timestamptz;
    return;
  end if;

  if v_order.status <> 'paid' then
    return query select
      'unpaid'::text,
      'Payment is not confirmed for this ticket order.'::text,
      v_ticket.id,
      v_ticket.ticket_code,
      v_ticket.status,
      v_ticket.holder_name,
      coalesce(v_item.ticket_type_name, 'Event Ticket'),
      v_order.order_number,
      null::timestamptz;
    return;
  end if;

  select *
    into v_existing_checkin
  from public.ticket_checkins
  where ticket_id = v_ticket.id;

  if found then
    return query select
      'already_used'::text,
      'This ticket has already been checked in.'::text,
      v_ticket.id,
      v_ticket.ticket_code,
      v_ticket.status,
      v_ticket.holder_name,
      coalesce(v_item.ticket_type_name, 'Event Ticket'),
      v_order.order_number,
      v_existing_checkin.checked_in_at;
    return;
  end if;

  insert into public.ticket_checkins (
    ticket_id,
    event_id,
    checked_in_by,
    device_label
  ) values (
    v_ticket.id,
    p_event_id,
    v_user_id,
    nullif(trim(coalesce(p_device_label, '')), '')
  )
  on conflict (ticket_id) do nothing
  returning * into v_new_checkin;

  if v_new_checkin.id is null then
    select *
      into v_existing_checkin
    from public.ticket_checkins
    where ticket_id = v_ticket.id;

    return query select
      'already_used'::text,
      'This ticket has already been checked in.'::text,
      v_ticket.id,
      v_ticket.ticket_code,
      v_ticket.status,
      v_ticket.holder_name,
      coalesce(v_item.ticket_type_name, 'Event Ticket'),
      v_order.order_number,
      v_existing_checkin.checked_in_at;
    return;
  end if;

  return query select
    'checked_in'::text,
    'Ticket checked in successfully.'::text,
    v_ticket.id,
    v_ticket.ticket_code,
    v_ticket.status,
    v_ticket.holder_name,
    coalesce(v_item.ticket_type_name, 'Event Ticket'),
    v_order.order_number,
    v_new_checkin.checked_in_at;
end;
$$;

revoke all on function public.check_in_ticket(uuid, text, text, text)
from public, anon;

grant execute on function public.check_in_ticket(uuid, text, text, text)
to authenticated;

commit;
