-- TEST_0022_SCANNER_RPC_ROLLBACK.sql
-- Safe direct RPC test. Ends with ROLLBACK so the ticket is not consumed.

begin;

select set_config(
  'request.jwt.claim.sub',
  (
    select ur.user_id::text
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    join public.profiles p on p.id = ur.user_id
    where r.code = 'super_admin'
      and ur.scope_id is null
      and p.status = 'active'
    order by ur.created_at asc
    limit 1
  ),
  true
);

select *
from public.check_in_ticket(
  (
    select t.event_id
    from public.tickets t
    where upper(t.ticket_code) = upper('TKT-26-1CBE5461870D')
    limit 1
  ),
  null,
  'TKT-26-1CBE5461870D',
  'SQL ROLLBACK TEST'
);

rollback;
