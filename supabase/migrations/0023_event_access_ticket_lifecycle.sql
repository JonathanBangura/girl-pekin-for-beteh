-- 0023_event_access_ticket_lifecycle.sql
-- Completes V1 event access modes and ticket lifecycle.

begin;

alter table public.ticket_orders
  add column if not exists source_type text not null default 'paid',
  add column if not exists source_reference_id uuid,
  add column if not exists confirmed_at timestamptz,
  add column if not exists created_by uuid references public.profiles(id) on delete set null,
  add column if not exists access_note text;

alter table public.ticket_orders
  drop constraint if exists ticket_orders_status_check;

alter table public.ticket_orders
  add constraint ticket_orders_status_check
  check (
    status in (
      'pending','payment_pending','paid','confirmed',
      'cancelled','refunded','partially_refunded'
    )
  );

alter table public.ticket_orders
  drop constraint if exists ticket_orders_source_type_check;

alter table public.ticket_orders
  add constraint ticket_orders_source_type_check
  check (
    source_type in (
      'paid','free_registration','invitation','complimentary'
    )
  );

create index if not exists ticket_orders_source_type_idx
  on public.ticket_orders(event_id, source_type, created_at desc);

drop index if exists public.tickets_item_sequence_unique;

create unique index if not exists tickets_active_item_sequence_unique
  on public.tickets(ticket_order_item_id, admission_sequence)
  where status = 'active';

create table if not exists public.event_invitations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  ticket_type_id uuid not null references public.ticket_types(id) on delete restrict,
  invite_token uuid not null default gen_random_uuid() unique,
  invitee_name text not null,
  invitee_email text,
  invitee_phone text,
  quantity integer not null default 1 check (quantity > 0),
  status text not null default 'pending'
    check (status in ('pending','claimed','revoked','expired')),
  expires_at timestamptz,
  note text,
  claimed_order_id uuid references public.ticket_orders(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists event_invitations_event_idx
  on public.event_invitations(event_id, created_at desc);

create index if not exists event_invitations_status_idx
  on public.event_invitations(event_id, status);

drop trigger if exists event_invitations_set_updated_at
  on public.event_invitations;

create trigger event_invitations_set_updated_at
before update on public.event_invitations
for each row execute function public.set_updated_at();

alter table public.event_invitations enable row level security;

drop policy if exists event_invitations_staff_read
  on public.event_invitations;

create policy event_invitations_staff_read
on public.event_invitations for select
to authenticated
using (
  public.has_permission('events.manage', 'event', event_id)
  or public.has_permission('audit.read')
);

grant select on table public.event_invitations to authenticated;

revoke insert, update, delete
on public.event_invitations
from anon, authenticated;

create or replace function public.reserved_ticket_admissions(
  p_event_id uuid,
  p_ticket_type_id uuid default null
)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(i.quantity * i.admissions_per_unit), 0)::bigint
  from public.ticket_order_items i
  join public.ticket_orders o on o.id = i.ticket_order_id
  where o.event_id = p_event_id
    and (p_ticket_type_id is null or i.ticket_type_id = p_ticket_type_id)
    and (
      o.status in ('paid', 'confirmed')
      or (
        o.status in ('pending', 'payment_pending')
        and (o.expires_at is null or o.expires_at > now())
      )
    );
$$;

revoke all
on function public.reserved_ticket_admissions(uuid, uuid)
from public, anon, authenticated;

grant execute
on function public.reserved_ticket_admissions(uuid, uuid)
to service_role;

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

  select e.* into v_event
  from public.events e
  where e.slug = p_event_slug
  for update;

  if not found
     or v_event.is_public is not true
     or v_event.status <> 'published'
     or v_event.access_type <> 'paid' then
    raise exception 'Event is not available for paid ticket sales';
  end if;

  select tt.* into v_type
  from public.ticket_types tt
  where tt.id = p_ticket_type_id
    and tt.event_id = v_event.id
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
    raise exception 'Free registration ticketing uses the registration workflow';
  else
    raise exception 'Unsupported pricing type';
  end if;

  v_admissions := p_quantity * v_type.admissions_per_unit;
  v_reserved_type := public.reserved_ticket_admissions(v_event.id, v_type.id);

  if v_type.capacity is not null
     and v_reserved_type + v_admissions > v_type.capacity then
    raise exception 'Not enough capacity remaining for this ticket type';
  end if;

  v_reserved_event := public.reserved_ticket_admissions(v_event.id, null);

  if v_event.capacity is not null
     and v_reserved_event + v_admissions > v_event.capacity then
    raise exception 'Not enough event capacity remaining';
  end if;

  v_order_id := gen_random_uuid();
  v_public_token := gen_random_uuid();
  v_order_number :=
    'ORD-' || to_char(coalesce(v_event.starts_at, now()), 'YY') || '-' ||
    upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 10));

  v_total_amount := v_unit_amount * p_quantity;

  insert into public.ticket_orders (
    id, order_number, public_token, event_id,
    purchaser_name, purchaser_email, purchaser_phone,
    subtotal, total_amount, currency, status, expires_at, source_type
  )
  values (
    v_order_id, v_order_number, v_public_token, v_event.id,
    trim(p_purchaser_name),
    nullif(trim(coalesce(p_purchaser_email, '')), ''),
    nullif(trim(coalesce(p_purchaser_phone, '')), ''),
    v_total_amount, v_total_amount, v_type.currency,
    'pending', now() + interval '30 minutes', 'paid'
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
  select v_order_id, v_payment_id, v_order_number, v_public_token,
         v_unit_amount, v_total_amount, v_type.currency;
end;
$$;

revoke all
on function public.create_ticket_order_reservation(
  text, uuid, integer, numeric, text, text, text
)
from public, anon, authenticated;

grant execute
on function public.create_ticket_order_reservation(
  text, uuid, integer, numeric, text, text, text
)
to service_role;

create or replace function public.create_free_event_registration(
  p_event_slug text,
  p_ticket_type_id uuid,
  p_quantity integer,
  p_registrant_name text,
  p_registrant_email text,
  p_registrant_phone text
)
returns table (
  ticket_order_id uuid,
  order_number text,
  public_token uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.events%rowtype;
  v_type public.ticket_types%rowtype;
  v_order_id uuid;
  v_order_number text;
  v_public_token uuid;
  v_email text;
  v_phone text;
  v_admissions bigint;
  v_reserved_type bigint;
  v_reserved_event bigint;
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Registration quantity must be greater than zero';
  end if;

  if nullif(trim(coalesce(p_registrant_name, '')), '') is null then
    raise exception 'Registrant name is required';
  end if;

  v_email := nullif(lower(trim(coalesce(p_registrant_email, ''))), '');
  v_phone := nullif(trim(coalesce(p_registrant_phone, '')), '');

  if v_email is null and v_phone is null then
    raise exception 'Email or phone number is required';
  end if;

  select e.* into v_event
  from public.events e
  where e.slug = p_event_slug
  for update;

  if not found
     or v_event.is_public is not true
     or v_event.status <> 'published'
     or v_event.access_type <> 'free_registration' then
    raise exception 'Event is not open for free registration';
  end if;

  select tt.* into v_type
  from public.ticket_types tt
  where tt.id = p_ticket_type_id
    and tt.event_id = v_event.id
  for update;

  if not found
     or v_type.is_active is not true
     or v_type.pricing_type <> 'free' then
    raise exception 'Free registration type is not available';
  end if;

  if v_type.sales_starts_at is not null and now() < v_type.sales_starts_at then
    raise exception 'Registration has not started';
  end if;

  if v_type.sales_ends_at is not null and now() > v_type.sales_ends_at then
    raise exception 'Registration has ended';
  end if;

  if v_type.max_per_order is not null and p_quantity > v_type.max_per_order then
    raise exception 'Maximum registration quantity is %', v_type.max_per_order;
  end if;

  if exists (
    select 1
    from public.ticket_orders o
    where o.event_id = v_event.id
      and o.source_type = 'free_registration'
      and o.status = 'confirmed'
      and (
        (v_email is not null and lower(coalesce(o.purchaser_email, '')) = v_email)
        or
        (v_phone is not null and coalesce(o.purchaser_phone, '') = v_phone)
      )
  ) then
    raise exception 'A confirmed registration already exists for these contact details';
  end if;

  v_admissions := p_quantity * v_type.admissions_per_unit;
  v_reserved_type := public.reserved_ticket_admissions(v_event.id, v_type.id);

  if v_type.capacity is not null
     and v_reserved_type + v_admissions > v_type.capacity then
    raise exception 'Not enough capacity remaining for this registration type';
  end if;

  v_reserved_event := public.reserved_ticket_admissions(v_event.id, null);

  if v_event.capacity is not null
     and v_reserved_event + v_admissions > v_event.capacity then
    raise exception 'Not enough event capacity remaining';
  end if;

  v_order_id := gen_random_uuid();
  v_public_token := gen_random_uuid();
  v_order_number :=
    'REG-' || to_char(coalesce(v_event.starts_at, now()), 'YY') || '-' ||
    upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 10));

  insert into public.ticket_orders (
    id, order_number, public_token, event_id,
    purchaser_name, purchaser_email, purchaser_phone,
    subtotal, total_amount, currency, status,
    source_type, confirmed_at, expires_at
  )
  values (
    v_order_id, v_order_number, v_public_token, v_event.id,
    trim(p_registrant_name), v_email, v_phone,
    0, 0, v_type.currency, 'confirmed',
    'free_registration', now(), null
  );

  insert into public.ticket_order_items (
    ticket_order_id, ticket_type_id, ticket_type_name, pricing_type,
    quantity, admissions_per_unit, unit_amount
  )
  values (
    v_order_id, v_type.id, v_type.name, 'free',
    p_quantity, v_type.admissions_per_unit, 0
  );

  return query
  select v_order_id, v_order_number, v_public_token;
end;
$$;

revoke all
on function public.create_free_event_registration(
  text, uuid, integer, text, text, text
)
from public, anon, authenticated;

grant execute
on function public.create_free_event_registration(
  text, uuid, integer, text, text, text
)
to service_role;


create or replace function public.get_public_event_invitation(
  p_invite_token uuid
)
returns table (
  invitation_id uuid,
  event_slug text,
  event_title text,
  event_status text,
  event_venue text,
  event_starts_at timestamptz,
  invitation_status text,
  invitee_name text,
  ticket_type_name text,
  quantity integer,
  expires_at timestamptz,
  claimed_public_token uuid
)
language sql
stable
security definer
set search_path = public
as $$
  select
    i.id,
    e.slug,
    e.title,
    e.status,
    e.venue,
    e.starts_at,
    case
      when i.status = 'pending'
       and i.expires_at is not null
       and i.expires_at < now()
      then 'expired'
      else i.status
    end,
    i.invitee_name,
    tt.name,
    i.quantity,
    i.expires_at,
    o.public_token
  from public.event_invitations i
  join public.events e on e.id = i.event_id
  join public.ticket_types tt on tt.id = i.ticket_type_id
  left join public.ticket_orders o on o.id = i.claimed_order_id
  where i.invite_token = p_invite_token
  limit 1;
$$;

grant execute
on function public.get_public_event_invitation(uuid)
to anon, authenticated;

create or replace function public.claim_event_invitation(
  p_invite_token uuid,
  p_claimant_name text,
  p_claimant_email text,
  p_claimant_phone text
)
returns table (
  ticket_order_id uuid,
  order_number text,
  public_token uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.event_invitations%rowtype;
  v_event public.events%rowtype;
  v_type public.ticket_types%rowtype;
  v_existing_order public.ticket_orders%rowtype;
  v_order_id uuid;
  v_order_number text;
  v_public_token uuid;
  v_name text;
  v_email text;
  v_phone text;
  v_admissions bigint;
  v_reserved_type bigint;
  v_reserved_event bigint;
begin
  select i.* into v_invite
  from public.event_invitations i
  where i.invite_token = p_invite_token
  for update;

  if not found then
    raise exception 'Invitation not found';
  end if;

  if v_invite.status = 'claimed'
     and v_invite.claimed_order_id is not null then
    select o.* into v_existing_order
    from public.ticket_orders o
    where o.id = v_invite.claimed_order_id;

    if found then
      return query
      select v_existing_order.id, v_existing_order.order_number,
             v_existing_order.public_token;
      return;
    end if;
  end if;

  if v_invite.status <> 'pending' then
    raise exception 'Invitation is not available';
  end if;

  if v_invite.expires_at is not null and v_invite.expires_at < now() then
    update public.event_invitations
    set status = 'expired'
    where id = v_invite.id;

    raise exception 'Invitation has expired';
  end if;

  select e.* into v_event
  from public.events e
  where e.id = v_invite.event_id
  for update;

  if not found
     or v_event.status <> 'published'
     or v_event.access_type <> 'invitation_only' then
    raise exception 'Event is not accepting invitation claims';
  end if;

  select tt.* into v_type
  from public.ticket_types tt
  where tt.id = v_invite.ticket_type_id
    and tt.event_id = v_event.id
  for update;

  if not found or v_type.is_active is not true then
    raise exception 'Invitation ticket type is unavailable';
  end if;

  v_name := coalesce(
    nullif(trim(coalesce(p_claimant_name, '')), ''),
    v_invite.invitee_name
  );

  v_email := coalesce(
    nullif(lower(trim(coalesce(p_claimant_email, ''))), ''),
    nullif(lower(trim(coalesce(v_invite.invitee_email, ''))), '')
  );

  v_phone := coalesce(
    nullif(trim(coalesce(p_claimant_phone, '')), ''),
    nullif(trim(coalesce(v_invite.invitee_phone, '')), '')
  );

  if v_email is null and v_phone is null then
    raise exception 'Email or phone number is required';
  end if;

  v_admissions := v_invite.quantity * v_type.admissions_per_unit;
  v_reserved_type := public.reserved_ticket_admissions(v_event.id, v_type.id);

  if v_type.capacity is not null
     and v_reserved_type + v_admissions > v_type.capacity then
    raise exception 'Not enough capacity remaining for this invitation';
  end if;

  v_reserved_event := public.reserved_ticket_admissions(v_event.id, null);

  if v_event.capacity is not null
     and v_reserved_event + v_admissions > v_event.capacity then
    raise exception 'Not enough event capacity remaining';
  end if;

  v_order_id := gen_random_uuid();
  v_public_token := gen_random_uuid();
  v_order_number :=
    'INV-' || to_char(coalesce(v_event.starts_at, now()), 'YY') || '-' ||
    upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 10));

  insert into public.ticket_orders (
    id, order_number, public_token, event_id,
    purchaser_name, purchaser_email, purchaser_phone,
    subtotal, total_amount, currency, status,
    source_type, source_reference_id, confirmed_at, expires_at
  )
  values (
    v_order_id, v_order_number, v_public_token, v_event.id,
    v_name, v_email, v_phone,
    0, 0, v_type.currency, 'confirmed',
    'invitation', v_invite.id, now(), null
  );

  insert into public.ticket_order_items (
    ticket_order_id, ticket_type_id, ticket_type_name, pricing_type,
    quantity, admissions_per_unit, unit_amount
  )
  values (
    v_order_id, v_type.id, v_type.name, v_type.pricing_type,
    v_invite.quantity, v_type.admissions_per_unit, 0
  );

  update public.event_invitations
  set status = 'claimed',
      claimed_order_id = v_order_id
  where id = v_invite.id;

  return query
  select v_order_id, v_order_number, v_public_token;
end;
$$;

revoke all
on function public.claim_event_invitation(uuid, text, text, text)
from public, anon, authenticated;

grant execute
on function public.claim_event_invitation(uuid, text, text, text)
to service_role;

create or replace function public.create_complimentary_ticket_order(
  p_event_id uuid,
  p_ticket_type_id uuid,
  p_quantity integer,
  p_guest_name text,
  p_guest_email text,
  p_guest_phone text,
  p_reason text
)
returns table (
  ticket_order_id uuid,
  order_number text,
  public_token uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_event public.events%rowtype;
  v_type public.ticket_types%rowtype;
  v_order_id uuid;
  v_order_number text;
  v_public_token uuid;
  v_admissions bigint;
  v_reserved_type bigint;
  v_reserved_event bigint;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not public.has_permission('events.manage', 'event', p_event_id) then
    raise exception 'Not authorized for this event' using errcode = '42501';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Quantity must be greater than zero';
  end if;

  if nullif(trim(coalesce(p_guest_name, '')), '') is null then
    raise exception 'Guest name is required';
  end if;

  if nullif(trim(coalesce(p_reason, '')), '') is null then
    raise exception 'Complimentary issuance reason is required';
  end if;

  select e.* into v_event
  from public.events e
  where e.id = p_event_id
  for update;

  if not found or v_event.status in ('cancelled', 'archived') then
    raise exception 'Event is not available for complimentary issuance';
  end if;

  select tt.* into v_type
  from public.ticket_types tt
  where tt.id = p_ticket_type_id
    and tt.event_id = v_event.id
  for update;

  if not found then
    raise exception 'Ticket type does not belong to this event';
  end if;

  v_admissions := p_quantity * v_type.admissions_per_unit;
  v_reserved_type := public.reserved_ticket_admissions(v_event.id, v_type.id);

  if v_type.capacity is not null
     and v_reserved_type + v_admissions > v_type.capacity then
    raise exception 'Not enough capacity remaining for this ticket type';
  end if;

  v_reserved_event := public.reserved_ticket_admissions(v_event.id, null);

  if v_event.capacity is not null
     and v_reserved_event + v_admissions > v_event.capacity then
    raise exception 'Not enough event capacity remaining';
  end if;

  v_order_id := gen_random_uuid();
  v_public_token := gen_random_uuid();
  v_order_number :=
    'COMP-' || to_char(coalesce(v_event.starts_at, now()), 'YY') || '-' ||
    upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 10));

  insert into public.ticket_orders (
    id, order_number, public_token, event_id,
    purchaser_name, purchaser_email, purchaser_phone,
    subtotal, total_amount, currency, status,
    source_type, confirmed_at, created_by, access_note, expires_at
  )
  values (
    v_order_id, v_order_number, v_public_token, v_event.id,
    trim(p_guest_name),
    nullif(lower(trim(coalesce(p_guest_email, ''))), ''),
    nullif(trim(coalesce(p_guest_phone, '')), ''),
    0, 0, v_type.currency, 'confirmed',
    'complimentary', now(), v_user_id, trim(p_reason), null
  );

  insert into public.ticket_order_items (
    ticket_order_id, ticket_type_id, ticket_type_name, pricing_type,
    quantity, admissions_per_unit, unit_amount
  )
  values (
    v_order_id, v_type.id, v_type.name, v_type.pricing_type,
    p_quantity, v_type.admissions_per_unit, 0
  );

  insert into public.audit_logs (
    actor_user_id, action, entity_type, entity_id,
    old_data, new_data, metadata
  )
  values (
    v_user_id,
    'complimentary_ticket_order_created',
    'ticket_order',
    v_order_id,
    null,
    jsonb_build_object(
      'event_id', v_event.id,
      'ticket_type_id', v_type.id,
      'quantity', p_quantity,
      'guest_name', trim(p_guest_name)
    ),
    jsonb_build_object('reason', trim(p_reason))
  );

  return query
  select v_order_id, v_order_number, v_public_token;
end;
$$;

revoke all
on function public.create_complimentary_ticket_order(
  uuid, uuid, integer, text, text, text, text
)
from public, anon;

grant execute
on function public.create_complimentary_ticket_order(
  uuid, uuid, integer, text, text, text, text
)
to authenticated;


create or replace function public.cancel_event_ticket(
  p_ticket_id uuid,
  p_reason text
)
returns table (
  ticket_id uuid,
  ticket_code text,
  ticket_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_ticket public.tickets%rowtype;
  v_new_ticket public.tickets%rowtype;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if nullif(trim(coalesce(p_reason, '')), '') is null then
    raise exception 'Cancellation reason is required';
  end if;

  select t.* into v_ticket
  from public.tickets t
  where t.id = p_ticket_id
  for update;

  if not found then
    raise exception 'Ticket not found';
  end if;

  if not public.has_permission('events.manage', 'event', v_ticket.event_id) then
    raise exception 'Not authorized for this event' using errcode = '42501';
  end if;

  if v_ticket.status <> 'active' then
    raise exception 'Only an active ticket can be cancelled';
  end if;

  if exists (
    select 1
    from public.ticket_checkins ci
    where ci.ticket_id = v_ticket.id
  ) then
    raise exception 'A checked-in ticket cannot be cancelled';
  end if;

  update public.tickets t
  set status = 'cancelled',
      cancelled_at = now()
  where t.id = v_ticket.id
  returning t.* into v_new_ticket;

  insert into public.audit_logs (
    actor_user_id, action, entity_type, entity_id,
    old_data, new_data, metadata
  )
  values (
    v_user_id,
    'ticket_cancelled',
    'ticket',
    v_ticket.id,
    to_jsonb(v_ticket),
    to_jsonb(v_new_ticket),
    jsonb_build_object('reason', trim(p_reason))
  );

  return query
  select v_new_ticket.id, v_new_ticket.ticket_code, v_new_ticket.status;
end;
$$;

revoke all
on function public.cancel_event_ticket(uuid, text)
from public, anon;

grant execute
on function public.cancel_event_ticket(uuid, text)
to authenticated;

create or replace function public.reissue_event_ticket(
  p_ticket_id uuid,
  p_new_ticket_id uuid,
  p_new_ticket_code text,
  p_new_qr_token_hash text,
  p_reason text
)
returns table (
  new_ticket_id uuid,
  new_ticket_code text,
  ticket_order_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_ticket public.tickets%rowtype;
  v_old_after public.tickets%rowtype;
  v_new_ticket public.tickets%rowtype;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if nullif(trim(coalesce(p_reason, '')), '') is null then
    raise exception 'Reissue reason is required';
  end if;

  if p_new_ticket_id is null
     or nullif(trim(coalesce(p_new_ticket_code, '')), '') is null
     or nullif(trim(coalesce(p_new_qr_token_hash, '')), '') is null then
    raise exception 'Replacement ticket credential is incomplete';
  end if;

  select t.* into v_ticket
  from public.tickets t
  where t.id = p_ticket_id
  for update;

  if not found then
    raise exception 'Ticket not found';
  end if;

  if not public.has_permission('events.manage', 'event', v_ticket.event_id) then
    raise exception 'Not authorized for this event' using errcode = '42501';
  end if;

  if v_ticket.status <> 'active' then
    raise exception 'Only an active ticket can be reissued';
  end if;

  if exists (
    select 1
    from public.ticket_checkins ci
    where ci.ticket_id = v_ticket.id
  ) then
    raise exception 'A checked-in ticket cannot be reissued';
  end if;

  update public.tickets t
  set status = 'reissued',
      cancelled_at = now()
  where t.id = v_ticket.id
  returning t.* into v_old_after;

  insert into public.tickets (
    id, ticket_order_id, ticket_order_item_id, event_id, ticket_type_id,
    ticket_code, qr_token_hash, status, holder_name,
    admission_sequence, reissued_from_ticket_id
  )
  values (
    p_new_ticket_id,
    v_ticket.ticket_order_id,
    v_ticket.ticket_order_item_id,
    v_ticket.event_id,
    v_ticket.ticket_type_id,
    trim(p_new_ticket_code),
    trim(p_new_qr_token_hash),
    'active',
    v_ticket.holder_name,
    v_ticket.admission_sequence,
    v_ticket.id
  )
  returning *
  into v_new_ticket;

  insert into public.audit_logs (
    actor_user_id, action, entity_type, entity_id,
    old_data, new_data, metadata
  )
  values (
    v_user_id,
    'ticket_reissued',
    'ticket',
    v_ticket.id,
    to_jsonb(v_ticket),
    to_jsonb(v_new_ticket),
    jsonb_build_object(
      'reason', trim(p_reason),
      'replacement_ticket_id', v_new_ticket.id
    )
  );

  return query
  select v_new_ticket.id, v_new_ticket.ticket_code, v_new_ticket.ticket_order_id;
end;
$$;

revoke all
on function public.reissue_event_ticket(uuid, uuid, text, text, text)
from public, anon;

grant execute
on function public.reissue_event_ticket(uuid, uuid, text, text, text)
to authenticated;

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
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not (
    public.has_permission('checkin.use', 'event', p_event_id)
    or public.has_permission('events.manage', 'event', p_event_id)
  ) then
    raise exception 'Not authorized for this event' using errcode = '42501';
  end if;

  select e.* into v_event
  from public.events e
  where e.id = p_event_id;

  if not found or v_event.status not in ('published', 'sales_closed') then
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
    select t.* into v_ticket
    from public.tickets t
    where t.qr_token_hash = trim(p_qr_token_hash)
    limit 1
    for update;
  else
    select t.* into v_ticket
    from public.tickets t
    where upper(t.ticket_code) = upper(trim(p_ticket_code))
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

  if v_ticket.event_id <> p_event_id then
    return query select
      'wrong_event'::text,
      'This ticket belongs to a different event.'::text,
      null::uuid, null::text, null::text, null::text,
      null::text, null::text, null::timestamptz;
    return;
  end if;

  select toi.* into v_item
  from public.ticket_order_items toi
  where toi.id = v_ticket.ticket_order_item_id;

  select tor.* into v_order
  from public.ticket_orders tor
  where tor.id = v_ticket.ticket_order_id;

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

  if v_order.status not in ('paid', 'confirmed') then
    return query select
      'unpaid'::text,
      'Admission is not confirmed for this ticket order.'::text,
      v_ticket.id,
      v_ticket.ticket_code,
      v_ticket.status,
      v_ticket.holder_name,
      coalesce(v_item.ticket_type_name, 'Event Ticket'),
      v_order.order_number,
      null::timestamptz;
    return;
  end if;

  select ci.* into v_existing_checkin
  from public.ticket_checkins ci
  where ci.ticket_id = v_ticket.id;

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

  insert into public.ticket_checkins as ci (
    ticket_id, event_id, checked_in_by, device_label
  )
  values (
    v_ticket.id, p_event_id, v_user_id,
    nullif(trim(coalesce(p_device_label, '')), '')
  )
  on conflict do nothing
  returning ci.*
  into v_new_checkin;

  if v_new_checkin.id is null then
    select ci.* into v_existing_checkin
    from public.ticket_checkins ci
    where ci.ticket_id = v_ticket.id;

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

revoke all
on function public.check_in_ticket(uuid, text, text, text)
from public, anon;

grant execute
on function public.check_in_ticket(uuid, text, text, text)
to authenticated;

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
      case
        when o.source_type <> 'paid' or o.total_amount = 0
        then 'not_required'
        else 'pending'
      end
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

grant execute
on function public.get_public_ticket_order_status(uuid)
to anon, authenticated;

commit;
