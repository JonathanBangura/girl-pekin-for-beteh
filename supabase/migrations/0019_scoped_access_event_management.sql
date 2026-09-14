-- 0019_scoped_access_event_management.sql
-- Production QA hardening:
-- 1) allow scoped staff to enter the admin workspace without turning
--    null-scope permission checks into broad authorization,
-- 2) make vote-order / vote-ledger read policies edition-scope aware.
--
-- IMPORTANT:
-- Do NOT change has_permission() semantics here. Existing global-only actions
-- rely on null scope remaining a true global check.

begin;

create or replace function public.has_any_permission(
  requested_permission_code text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.role_permissions rp
      on rp.role_id = ur.role_id
    join public.permissions p
      on p.id = rp.permission_id
    join public.profiles pr
      on pr.id = ur.user_id
    where ur.user_id = auth.uid()
      and pr.status = 'active'
      and p.code = requested_permission_code
  );
$$;

revoke all on function public.has_any_permission(text)
from public, anon;

grant execute on function public.has_any_permission(text)
to authenticated;

create or replace function public.has_nominee_edition_permission(
  requested_permission_code text,
  requested_nominee_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.nominees n
    where n.id = requested_nominee_id
      and public.has_permission(
        requested_permission_code,
        'award_edition',
        n.award_edition_id
      )
  );
$$;

revoke all on function public.has_nominee_edition_permission(text, uuid)
from public, anon;

grant execute on function public.has_nominee_edition_permission(text, uuid)
to authenticated;

drop policy if exists vote_orders_staff_read
on public.vote_orders;

create policy vote_orders_staff_read
on public.vote_orders for select
to authenticated
using (
  public.has_nominee_edition_permission(
    'voting.manage',
    nominee_id
  )
  or public.has_permission('finance.manage')
  or public.has_permission('audit.read')
);

drop policy if exists vote_ledger_staff_read
on public.vote_ledger;

create policy vote_ledger_staff_read
on public.vote_ledger for select
to authenticated
using (
  public.has_nominee_edition_permission(
    'voting.manage',
    nominee_id
  )
  or public.has_nominee_edition_permission(
    'results.manage',
    nominee_id
  )
  or public.has_permission('finance.manage')
  or public.has_permission('audit.read')
);

commit;
