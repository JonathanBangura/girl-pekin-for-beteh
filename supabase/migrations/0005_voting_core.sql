-- 0005_voting_core.sql
begin;

create table if not exists public.vote_pricing (
  id uuid primary key default gen_random_uuid(),
  award_edition_id uuid not null unique references public.award_editions(id) on delete cascade,
  unit_price numeric(14,2) not null check (unit_price > 0),
  currency text not null default 'SLE',
  min_quantity integer not null default 1 check (min_quantity > 0),
  max_quantity integer not null default 1000 check (max_quantity >= min_quantity),
  quick_quantities integer[] not null default array[10,25,50,100],
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists vote_pricing_set_updated_at on public.vote_pricing;
create trigger vote_pricing_set_updated_at
before update on public.vote_pricing
for each row execute function public.set_updated_at();

alter table public.vote_orders
  add column if not exists public_token uuid not null default gen_random_uuid();

create unique index if not exists vote_orders_public_token_unique
  on public.vote_orders(public_token);

alter table public.vote_pricing enable row level security;

drop policy if exists vote_pricing_public_read on public.vote_pricing;
create policy vote_pricing_public_read
on public.vote_pricing for select
to anon, authenticated
using (
  is_active = true
  and exists (
    select 1
    from public.award_editions e
    where e.id = vote_pricing.award_edition_id
      and e.is_public = true
      and e.status <> 'draft'
      and e.status <> 'archived'
  )
);

drop policy if exists vote_pricing_staff_read on public.vote_pricing;
create policy vote_pricing_staff_read
on public.vote_pricing for select
to authenticated
using (
  public.has_permission('voting.manage', 'award_edition', award_edition_id)
  or public.has_permission('awards.manage', 'award_edition', award_edition_id)
  or public.has_permission('audit.read')
);

grant select on table public.vote_pricing to anon, authenticated;
revoke insert, update, delete on table public.vote_pricing from anon, authenticated;

create or replace function public.get_public_vote_order_status(p_public_token uuid)
returns table (
  order_number text,
  order_status text,
  quantity integer,
  total_amount numeric,
  currency text,
  nominee_code text,
  nominee_name text,
  payment_status text,
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
    o.quantity,
    o.total_amount,
    o.currency,
    n.nominee_code,
    n.full_name,
    coalesce(p.status, 'pending'),
    o.created_at
  from public.vote_orders o
  join public.nominees n on n.id = o.nominee_id
  left join lateral (
    select p2.status
    from public.payments p2
    where p2.vote_order_id = o.id
    order by p2.created_at desc
    limit 1
  ) p on true
  where o.public_token = p_public_token
  limit 1;
$$;

grant execute on function public.get_public_vote_order_status(uuid)
to anon, authenticated;

create or replace function public.settle_vote_payment_success(
  p_payment_id uuid,
  p_provider_transaction_id text,
  p_provider_payload jsonb default '{}'::jsonb,
  p_paid_at timestamptz default now()
)
returns table (
  vote_order_id uuid,
  nominee_id uuid,
  quantity integer,
  order_number text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.payments%rowtype;
  v_order public.vote_orders%rowtype;
begin
  select * into v_payment
  from public.payments
  where id = p_payment_id
  for update;

  if not found then
    raise exception 'Payment % not found', p_payment_id;
  end if;

  if v_payment.payment_type <> 'vote' or v_payment.vote_order_id is null then
    raise exception 'Payment % is not a vote payment', p_payment_id;
  end if;

  if v_payment.status in ('refunded', 'partially_refunded', 'reversed') then
    raise exception 'Payment % cannot be settled from status %', p_payment_id, v_payment.status;
  end if;

  select * into v_order
  from public.vote_orders
  where id = v_payment.vote_order_id
  for update;

  if not found then
    raise exception 'Vote order for payment % not found', p_payment_id;
  end if;

  if v_payment.amount <> v_order.total_amount
     or v_payment.currency <> v_order.currency then
    raise exception 'Payment amount/currency does not match vote order';
  end if;

  update public.payments
  set
    provider_transaction_id = coalesce(p_provider_transaction_id, provider_transaction_id),
    provider_payload = coalesce(provider_payload, '{}'::jsonb)
      || coalesce(p_provider_payload, '{}'::jsonb),
    status = 'succeeded',
    paid_at = coalesce(p_paid_at, now()),
    failure_reason = null,
    updated_at = now()
  where id = p_payment_id;

  update public.vote_orders
  set status = 'paid', updated_at = now()
  where id = v_order.id;

  insert into public.vote_ledger (
    nominee_id, vote_order_id, payment_id, entry_type,
    quantity_delta, source_key, reason
  )
  values (
    v_order.nominee_id, v_order.id, p_payment_id, 'payment',
    v_order.quantity, 'payment:' || p_payment_id::text, 'Successful vote payment'
  )
  on conflict (source_key) do nothing;

  return query
  select v_order.id, v_order.nominee_id, v_order.quantity, v_order.order_number;
end;
$$;

revoke all on function public.settle_vote_payment_success(
  uuid, text, jsonb, timestamptz
) from public, anon, authenticated;

grant execute on function public.settle_vote_payment_success(
  uuid, text, jsonb, timestamptz
) to service_role;

commit;
