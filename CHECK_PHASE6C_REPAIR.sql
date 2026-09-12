-- Read-only Phase 6C repair verification.

-- 1. The scanner RPC should exist.
select to_regprocedure(
  'public.check_in_ticket(uuid,text,text,text)'
) as scanner_function;

-- 2. Authenticated users must NOT retain direct INSERT privilege on
-- ticket_checkins. This should return zero rows for INSERT.
select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'ticket_checkins'
  and grantee in ('anon', 'authenticated')
  and privilege_type in ('INSERT', 'UPDATE', 'DELETE')
order by grantee, privilege_type;

-- 3. The old direct-insert RLS policy should be gone.
select policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename = 'ticket_checkins'
  and policyname = 'checkins_officer_insert';

-- 4. One-time admission must still be guaranteed.
select ticket_id, count(*) as checkin_count
from public.ticket_checkins
group by ticket_id
having count(*) > 1;
