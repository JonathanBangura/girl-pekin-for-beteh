-- 0009_ticket_delivery.sql
begin;

alter table public.ticket_orders
  add column if not exists delivery_status text not null default 'pending'
    check (delivery_status in ('pending', 'sent', 'failed', 'not_available')),
  add column if not exists delivered_at timestamptz,
  add column if not exists delivery_last_error text;

create table if not exists public.ticket_delivery_attempts (
  id uuid primary key default gen_random_uuid(),
  ticket_order_id uuid not null references public.ticket_orders(id) on delete cascade,
  channel text not null default 'email' check (channel in ('email')),
  recipient text,
  provider text not null default 'resend',
  provider_message_id text,
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'failed', 'skipped')),
  error_message text,
  attempted_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists ticket_delivery_attempts_order_idx
  on public.ticket_delivery_attempts(ticket_order_id, attempted_at desc);

alter table public.ticket_delivery_attempts enable row level security;

drop policy if exists ticket_delivery_attempts_staff_read
  on public.ticket_delivery_attempts;

create policy ticket_delivery_attempts_staff_read
on public.ticket_delivery_attempts for select
to authenticated
using (
  exists (
    select 1
    from public.ticket_orders o
    where o.id = ticket_delivery_attempts.ticket_order_id
      and (
        public.has_permission('events.manage', 'event', o.event_id)
        or public.has_permission('finance.manage')
        or public.has_permission('audit.read')
      )
  )
);

revoke insert, update, delete
on public.ticket_delivery_attempts
from anon, authenticated;

commit;
