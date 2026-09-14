-- CHECK_PHASE13_SCOPED_ACCESS_EVENTS.sql
-- Run after 0019_scoped_access_event_management.sql.

select
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'has_any_permission',
    'has_nominee_edition_permission'
  )
order by p.proname;

select
  tablename,
  policyname,
  roles,
  cmd,
  qual
from pg_policies
where schemaname = 'public'
  and policyname in (
    'vote_orders_staff_read',
    'vote_ledger_staff_read'
  )
order by tablename, policyname;

-- Informational: current scoped staff assignments.
select
  r.code as role_code,
  ur.scope_type,
  ur.scope_id,
  count(*) as assignments
from public.user_roles ur
join public.roles r on r.id = ur.role_id
where ur.scope_id is not null
group by r.code, ur.scope_type, ur.scope_id
order by r.code, ur.scope_type;
