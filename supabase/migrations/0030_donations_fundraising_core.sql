-- Girl Pikin For Betteh Foundation
-- 0030_donations_fundraising_core.sql
--
-- Professional one-time fundraising / donation module.
--
-- Adds:
-- - Donation campaigns, including a seeded unrestricted General Fund
-- - Donation intents linked to the existing central payments table
-- - Fundraising RBAC permissions / Fundraising Manager role
-- - Public, PII-safe campaign + receipt RPCs
-- - Atomic donation-order creation
-- - Atomic donation payment settlement
-- - Donation support in the shared Vult public-payment-status RPC
-- - Donation references in Finance -> Payments
-- - Donation reporting RPC
--
-- No recurring billing is introduced in this phase.
-- No refund workflow is re-enabled.

begin;

-- =========================================================
-- 1. RBAC
-- =========================================================

insert into public.roles (code, name, description)
values (
  'fundraising_manager',
  'Fundraising Manager',
  'Manages donation campaigns and fundraising operations'
)
on conflict (code) do update
set name = excluded.name,
    description = excluded.description;

insert into public.permissions (code, name, description)
values
  (
    'donations.read',
    'Read donations',
    'View donation transactions, donors and fundraising reports'
  ),
  (
    'donations.manage',
    'Manage donations',
    'Create and maintain fundraising campaigns and donation operations'
  )
on conflict (code) do update
set name = excluded.name,
    description = excluded.description;

-- Super Admin receives the new permissions.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p
  on p.code in ('donations.read', 'donations.manage')
where r.code = 'super_admin'
on conflict do nothing;

-- Fundraising Manager receives administration + donation permissions.
with mappings(role_code, permission_code) as (
  values
    ('fundraising_manager', 'admin.access'),
    ('fundraising_manager', 'donations.read'),
    ('fundraising_manager', 'donations.manage'),
    ('finance_officer', 'donations.read'),
    ('auditor', 'donations.read')
)
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from mappings m
join public.roles r
  on r.code = m.role_code
join public.permissions p
  on p.code = m.permission_code
on conflict do nothing;

-- =========================================================
-- 2. CAMPAIGNS
-- =========================================================

create table if not exists public.donation_campaigns (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  summary text,
  description text,
  campaign_kind text not null default 'campaign'
    check (campaign_kind in ('general', 'campaign')),
  fund_type text not null default 'restricted'
    check (fund_type in ('unrestricted', 'restricted')),
  goal_amount numeric(14,2)
    check (goal_amount is null or goal_amount > 0),
  currency text not null default 'SLE',
  minimum_amount numeric(14,2) not null default 10
    check (minimum_amount > 0),
  cover_image_url text,
  starts_at timestamptz,
  ends_at timestamptz,
  status text not null default 'draft'
    check (status in ('draft', 'active', 'paused', 'closed', 'archived')),
  is_public boolean not null default false,
  show_progress boolean not null default true,
  sort_order integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    starts_at is null
    or ends_at is null
    or starts_at < ends_at
  )
);

create index if not exists donation_campaigns_public_idx
  on public.donation_campaigns(status, is_public, sort_order, created_at desc);

drop trigger if exists donation_campaigns_set_updated_at
on public.donation_campaigns;

create trigger donation_campaigns_set_updated_at
before update on public.donation_campaigns
for each row execute function public.set_updated_at();

-- The General Fund is the unrestricted default donation destination.
insert into public.donation_campaigns (
  slug,
  title,
  summary,
  description,
  campaign_kind,
  fund_type,
  currency,
  minimum_amount,
  status,
  is_public,
  show_progress,
  sort_order
)
values (
  'general-fund',
  'General Fund',
  'Support the Foundation where help is needed most.',
  'Unrestricted contributions support Girl Pikin For Betteh Foundation programmes, operations, outreach and mission delivery where they are needed most.',
  'general',
  'unrestricted',
  'SLE',
  10,
  'active',
  true,
  false,
  -100
)
on conflict (slug) do nothing;

-- =========================================================
-- 3. DONATIONS
-- =========================================================

create table if not exists public.donations (
  id uuid primary key default gen_random_uuid(),
  donation_number text not null unique,
  public_token uuid not null default gen_random_uuid() unique,
  campaign_id uuid not null
    references public.donation_campaigns(id) on delete restrict,
  donor_type text not null default 'individual'
    check (donor_type in ('individual', 'organisation')),
  donor_name text,
  organisation_name text,
  donor_email text,
  donor_phone text,
  is_anonymous boolean not null default false,
  message text,
  amount numeric(14,2) not null check (amount > 0),
  currency text not null default 'SLE',
  status text not null default 'pending'
    check (status in (
      'pending',
      'payment_pending',
      'succeeded',
      'failed',
      'cancelled'
    )),
  paid_at timestamptz,
  receipt_email_sent_at timestamptz,
  receipt_email_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists donations_campaign_idx
  on public.donations(campaign_id, status, created_at desc);

create index if not exists donations_status_idx
  on public.donations(status, created_at desc);

create index if not exists donations_donor_email_idx
  on public.donations(lower(donor_email))
  where donor_email is not null;

create index if not exists donations_donor_phone_idx
  on public.donations(donor_phone)
  where donor_phone is not null;

drop trigger if exists donations_set_updated_at
on public.donations;

create trigger donations_set_updated_at
before update on public.donations
for each row execute function public.set_updated_at();

-- Link a donation payment to its donation intent while preserving the
-- pre-existing vote/ticket payment model.
alter table public.payments
add column if not exists donation_id uuid
  references public.donations(id) on delete restrict;

create unique index if not exists payments_donation_unique
  on public.payments(donation_id)
  where donation_id is not null;

-- Enforce the relationship for all new/updated rows without risking failure
-- from any unexpected historical donation payment created before this module.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'payments_donation_relation_check'
      and conrelid = 'public.payments'::regclass
  ) then
    alter table public.payments
    add constraint payments_donation_relation_check
    check (
      (payment_type = 'donation' and donation_id is not null)
      or
      (payment_type <> 'donation' and donation_id is null)
    )
    not valid;
  end if;
end;
$$;

-- =========================================================
-- 4. RLS + TABLE ACCESS
-- =========================================================

alter table public.donation_campaigns enable row level security;
alter table public.donations enable row level security;

-- Public clients do not read these tables directly.
-- PII-free public access goes through explicitly controlled RPCs below.
revoke all on table public.donation_campaigns from anon, authenticated;
revoke all on table public.donations from anon, authenticated;

grant select, insert, update on table public.donation_campaigns to service_role;
grant select, insert, update on table public.donations to service_role;

-- =========================================================
-- 5. PUBLIC CAMPAIGN DIRECTORY
-- =========================================================

create or replace function public.get_public_donation_campaigns(
  p_slug text default null
)
returns table (
  id uuid,
  slug text,
  title text,
  summary text,
  description text,
  campaign_kind text,
  fund_type text,
  goal_amount numeric,
  currency text,
  minimum_amount numeric,
  cover_image_url text,
  starts_at timestamptz,
  ends_at timestamptz,
  show_progress boolean,
  raised_amount numeric,
  donation_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.slug,
    c.title,
    c.summary,
    c.description,
    c.campaign_kind,
    c.fund_type,
    c.goal_amount,
    c.currency,
    c.minimum_amount,
    c.cover_image_url,
    c.starts_at,
    c.ends_at,
    c.show_progress,
    coalesce(
      sum(d.amount) filter (where d.status = 'succeeded'),
      0
    )::numeric as raised_amount,
    count(d.id) filter (where d.status = 'succeeded')::bigint
      as donation_count
  from public.donation_campaigns c
  left join public.donations d
    on d.campaign_id = c.id
  where c.status = 'active'
    and c.is_public is true
    and (c.starts_at is null or c.starts_at <= now())
    and (c.ends_at is null or c.ends_at >= now())
    and (
      p_slug is null
      or btrim(p_slug) = ''
      or c.slug = btrim(p_slug)
    )
  group by
    c.id,
    c.slug,
    c.title,
    c.summary,
    c.description,
    c.campaign_kind,
    c.fund_type,
    c.goal_amount,
    c.currency,
    c.minimum_amount,
    c.cover_image_url,
    c.starts_at,
    c.ends_at,
    c.show_progress,
    c.sort_order,
    c.created_at
  order by
    case when c.campaign_kind = 'general' then 0 else 1 end,
    c.sort_order,
    c.created_at desc;
$$;

revoke all
on function public.get_public_donation_campaigns(text)
from public, anon, authenticated;

grant execute
on function public.get_public_donation_campaigns(text)
to anon, authenticated;

-- =========================================================
-- 6. ATOMIC DONATION ORDER CREATION
-- =========================================================

create or replace function public.create_donation_order(
  p_campaign_id uuid,
  p_amount numeric,
  p_payment_method text,
  p_donor_type text,
  p_donor_name text,
  p_organisation_name text,
  p_donor_email text,
  p_donor_phone text,
  p_is_anonymous boolean,
  p_message text
)
returns table (
  donation_id uuid,
  payment_id uuid,
  donation_number text,
  public_token uuid,
  amount numeric,
  currency text,
  campaign_slug text,
  campaign_title text
)
language plpgsql
security invoker
set search_path = public, extensions
as $$
declare
  v_campaign public.donation_campaigns%rowtype;
  v_donation_id uuid := gen_random_uuid();
  v_payment_id uuid := gen_random_uuid();
  v_donation_number text;
  v_donor_type text := lower(btrim(coalesce(p_donor_type, 'individual')));
  v_email text := nullif(lower(btrim(coalesce(p_donor_email, ''))), '');
  v_phone text := nullif(btrim(coalesce(p_donor_phone, '')), '');
  v_name text := nullif(btrim(coalesce(p_donor_name, '')), '');
  v_organisation text := nullif(btrim(coalesce(p_organisation_name, '')), '');
  v_message text := nullif(btrim(coalesce(p_message, '')), '');
  v_payment_method text := lower(btrim(coalesce(p_payment_method, '')));
  v_payer_name text;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Donation amount must be greater than zero';
  end if;

  if v_payment_method not in ('in-app', 'momo', 'card') then
    raise exception 'Unsupported payment method';
  end if;

  if v_donor_type not in ('individual', 'organisation') then
    raise exception 'Unsupported donor type';
  end if;

  select c.*
  into v_campaign
  from public.donation_campaigns c
  where c.id = p_campaign_id
    and c.status = 'active'
    and c.is_public is true
    and (c.starts_at is null or c.starts_at <= now())
    and (c.ends_at is null or c.ends_at >= now())
  limit 1;

  if not found then
    raise exception 'Donation campaign is not currently available';
  end if;

  if p_amount < v_campaign.minimum_amount then
    raise exception 'Donation amount is below the campaign minimum';
  end if;

  if coalesce(p_is_anonymous, false) is not true then
    if v_donor_type = 'individual' and v_name is null then
      raise exception 'Donor name is required';
    end if;

    if v_donor_type = 'organisation' and v_organisation is null then
      raise exception 'Organisation name is required';
    end if;
  end if;

  if v_message is not null and length(v_message) > 500 then
    raise exception 'Donation message is too long';
  end if;

  v_donation_number :=
    'DON-' || to_char(now(), 'YY') || '-' ||
    upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 10));

  v_payer_name := case
    when coalesce(p_is_anonymous, false) then 'Anonymous Donor'
    when v_donor_type = 'organisation'
      then coalesce(v_organisation, v_name, 'Organisation Donor')
    else coalesce(v_name, 'Donor')
  end;

  insert into public.donations (
    id,
    donation_number,
    campaign_id,
    donor_type,
    donor_name,
    organisation_name,
    donor_email,
    donor_phone,
    is_anonymous,
    message,
    amount,
    currency,
    status
  )
  values (
    v_donation_id,
    v_donation_number,
    v_campaign.id,
    v_donor_type,
    v_name,
    v_organisation,
    v_email,
    v_phone,
    coalesce(p_is_anonymous, false),
    v_message,
    p_amount,
    v_campaign.currency,
    'pending'
  );

  insert into public.payments (
    id,
    payment_type,
    donation_id,
    provider,
    idempotency_key,
    amount,
    currency,
    status,
    payer_name,
    payer_email,
    payer_phone,
    provider_payload
  )
  values (
    v_payment_id,
    'donation',
    v_donation_id,
    'vult',
    'donation:' || v_donation_id::text,
    p_amount,
    v_campaign.currency,
    'pending',
    v_payer_name,
    v_email,
    v_phone,
    jsonb_build_object(
      'integration_status', 'adapter_pending',
      'payment_method', v_payment_method,
      'campaign_slug', v_campaign.slug
    )
  );

  return query
  select
    v_donation_id,
    v_payment_id,
    v_donation_number,
    (
      select d.public_token
      from public.donations d
      where d.id = v_donation_id
    ),
    p_amount,
    v_campaign.currency,
    v_campaign.slug,
    v_campaign.title;
end;
$$;

revoke all
on function public.create_donation_order(
  uuid, numeric, text, text, text, text, text, text, boolean, text
)
from public, anon, authenticated;

grant execute
on function public.create_donation_order(
  uuid, numeric, text, text, text, text, text, text, boolean, text
)
to service_role;

-- =========================================================
-- 7. ATOMIC DONATION SETTLEMENT
-- =========================================================

create or replace function public.mark_donation_payment_success(
  p_payment_id uuid,
  p_provider_transaction_id text,
  p_provider_payload jsonb default '{}'::jsonb,
  p_paid_at timestamptz default now()
)
returns table (
  donation_id uuid,
  donation_number text
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_payment public.payments%rowtype;
  v_donation public.donations%rowtype;
begin
  select p.*
  into v_payment
  from public.payments p
  where p.id = p_payment_id
  for update;

  if not found then
    raise exception 'Payment % not found', p_payment_id;
  end if;

  if v_payment.payment_type <> 'donation'
     or v_payment.donation_id is null then
    raise exception 'Payment % is not a donation payment', p_payment_id;
  end if;

  select d.*
  into v_donation
  from public.donations d
  where d.id = v_payment.donation_id
  for update;

  if not found then
    raise exception 'Donation not found';
  end if;

  if v_payment.amount <> v_donation.amount
     or v_payment.currency <> v_donation.currency then
    raise exception 'Payment amount/currency does not match donation';
  end if;

  if v_payment.status in ('refunded', 'partially_refunded', 'reversed') then
    raise exception 'Payment % cannot be settled from status %',
      p_payment_id, v_payment.status;
  end if;

  update public.payments
  set
    provider_transaction_id = coalesce(
      nullif(btrim(coalesce(p_provider_transaction_id, '')), ''),
      provider_transaction_id
    ),
    provider_payload = coalesce(provider_payload, '{}'::jsonb)
      || coalesce(p_provider_payload, '{}'::jsonb),
    status = 'succeeded',
    failure_reason = null,
    paid_at = coalesce(p_paid_at, paid_at, now()),
    updated_at = now()
  where id = p_payment_id;

  update public.donations
  set
    status = 'succeeded',
    paid_at = coalesce(p_paid_at, paid_at, now()),
    receipt_email_error = null,
    updated_at = now()
  where id = v_donation.id;

  return query
  select v_donation.id, v_donation.donation_number;
end;
$$;

revoke all
on function public.mark_donation_payment_success(uuid, text, jsonb, timestamptz)
from public, anon, authenticated;

grant execute
on function public.mark_donation_payment_success(uuid, text, jsonb, timestamptz)
to service_role;

-- =========================================================
-- 8. PUBLIC DONATION RECEIPT / ACKNOWLEDGEMENT
-- =========================================================

create or replace function public.get_public_donation_receipt(
  p_public_token uuid
)
returns table (
  donation_number text,
  donation_status text,
  donor_display_name text,
  amount numeric,
  currency text,
  campaign_title text,
  campaign_slug text,
  fund_type text,
  payment_method text,
  provider_transaction_id text,
  paid_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    d.donation_number,
    d.status,
    case
      when d.is_anonymous then 'Anonymous Donor'
      when d.donor_type = 'organisation'
        then coalesce(d.organisation_name, 'Organisation Donor')
      else coalesce(d.donor_name, 'Donor')
    end::text,
    d.amount,
    d.currency,
    c.title,
    c.slug,
    c.fund_type,
    coalesce(p.provider_payload ->> 'payment_method', 'unknown')::text,
    p.provider_transaction_id,
    d.paid_at
  from public.donations d
  join public.donation_campaigns c
    on c.id = d.campaign_id
  join public.payments p
    on p.donation_id = d.id
  where d.public_token = p_public_token
    and d.status = 'succeeded'
    and p.status = 'succeeded'
  limit 1;
$$;

revoke all
on function public.get_public_donation_receipt(uuid)
from public, anon, authenticated;

grant execute
on function public.get_public_donation_receipt(uuid)
to anon, authenticated;

-- =========================================================
-- 9. SHARED PUBLIC VULT PAYMENT STATUS
--    Extend existing vote/ticket function with donation support.
-- =========================================================

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
    join public.nominees n
      on n.id = o.nominee_id
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
    join public.events e
      on e.id = o.event_id
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

  if p_order_kind = 'donation' then
    return query
    select
      'donation'::text,
      d.donation_number,
      d.status,
      coalesce(p.status, 'pending'),
      p.provider_payload->>'payment_method',
      p.provider_payload->>'link',
      p.provider_payload->>'code',
      p.provider_payload->>'last_webhook_status',
      d.amount,
      d.currency,
      c.title,
      c.slug,
      null::bigint,
      d.created_at
    from public.donations d
    join public.donation_campaigns c
      on c.id = d.campaign_id
    left join lateral (
      select p2.status, p2.provider_payload
      from public.payments p2
      where p2.donation_id = d.id
        and p2.provider = 'vult'
      order by p2.created_at desc
      limit 1
    ) p on true
    where d.public_token = p_public_token
    limit 1;

    return;
  end if;
end;
$$;

revoke all
on function public.get_public_vult_payment_status(text, uuid)
from public, anon, authenticated;

grant execute
on function public.get_public_vult_payment_status(text, uuid)
to anon, authenticated;

-- =========================================================
-- 10. DONATION REPORTING
-- =========================================================

create or replace function public.donation_report_summary(
  p_from timestamptz default null,
  p_to timestamptz default null
)
returns table (
  donation_count bigint,
  by_currency jsonb,
  by_campaign jsonb,
  by_method jsonb,
  by_donor_type jsonb
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with paid as (
    select
      d.*,
      c.title as campaign_title,
      c.slug as campaign_slug,
      c.fund_type,
      case lower(coalesce(p.provider_payload ->> 'payment_method', ''))
        when 'in-app' then 'in-app'
        when 'momo' then 'momo'
        when 'card' then 'card'
        else 'unknown'
      end::text as payment_method
    from public.donations d
    join public.donation_campaigns c
      on c.id = d.campaign_id
    join public.payments p
      on p.donation_id = d.id
    where d.status = 'succeeded'
      and p.status = 'succeeded'
      and d.paid_at is not null
      and (p_from is null or d.paid_at >= p_from)
      and (p_to is null or d.paid_at <= p_to)
  )
  select
    (select count(*) from paid)::bigint,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'currency', r.currency,
            'count', r.donation_count,
            'amount', r.amount
          )
          order by r.currency
        )
        from (
          select
            currency,
            count(*)::bigint as donation_count,
            sum(amount)::numeric as amount
          from paid
          group by currency
        ) r
      ),
      '[]'::jsonb
    ),
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'campaign_id', r.campaign_id,
            'campaign_title', r.campaign_title,
            'campaign_slug', r.campaign_slug,
            'fund_type', r.fund_type,
            'currency', r.currency,
            'count', r.donation_count,
            'amount', r.amount
          )
          order by r.amount desc, r.campaign_title
        )
        from (
          select
            campaign_id,
            campaign_title,
            campaign_slug,
            fund_type,
            currency,
            count(*)::bigint as donation_count,
            sum(amount)::numeric as amount
          from paid
          group by
            campaign_id,
            campaign_title,
            campaign_slug,
            fund_type,
            currency
        ) r
      ),
      '[]'::jsonb
    ),
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'payment_method', r.payment_method,
            'currency', r.currency,
            'count', r.donation_count,
            'amount', r.amount
          )
          order by r.payment_method, r.currency
        )
        from (
          select
            payment_method,
            currency,
            count(*)::bigint as donation_count,
            sum(amount)::numeric as amount
          from paid
          group by payment_method, currency
        ) r
      ),
      '[]'::jsonb
    ),
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'donor_type', r.donor_type,
            'currency', r.currency,
            'count', r.donation_count,
            'amount', r.amount
          )
          order by r.donor_type, r.currency
        )
        from (
          select
            donor_type,
            currency,
            count(*)::bigint as donation_count,
            sum(amount)::numeric as amount
          from paid
          group by donor_type, currency
        ) r
      ),
      '[]'::jsonb
    );
$$;

revoke all
on function public.donation_report_summary(timestamptz, timestamptz)
from public, anon, authenticated;

grant execute
on function public.donation_report_summary(timestamptz, timestamptz)
to service_role;

-- =========================================================
-- 11. FINANCE -> PAYMENTS
--     Keep the existing function contract, but surface donation references.
-- =========================================================

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
      coalesce(
        vo.order_number,
        tord.order_number,
        d.donation_number,
        '—'
      )::text as order_number,
      coalesce(
        vo.status,
        tord.status,
        d.status
      )::text as order_status,
      tord.delivery_status,
      tord.delivery_last_error
    from public.payments p
    left join public.vote_orders vo
      on vo.id = p.vote_order_id
    left join public.ticket_orders tord
      on tord.id = p.ticket_order_id
    left join public.donations d
      on d.id = p.donation_id
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

revoke all
on function public.finance_payments_page(
  text, text, text, text, text, integer, integer
)
from public, anon, authenticated;

grant execute
on function public.finance_payments_page(
  text, text, text, text, text, integer, integer
)
to service_role;

commit;
