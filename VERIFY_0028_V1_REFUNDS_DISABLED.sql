-- Girl Pikin For Betteh
-- Verify V1 refund operations are disabled.
-- Run after 0028_v1_disable_refund_operations.sql.

select
  has_function_privilege(
    'anon',
    'public.record_external_full_refund(uuid,text,text,text,text,text)',
    'EXECUTE'
  ) as anon_can_refund,
  has_function_privilege(
    'authenticated',
    'public.record_external_full_refund(uuid,text,text,text,text,text)',
    'EXECUTE'
  ) as authenticated_can_refund;

-- Expected:
-- anon_can_refund = false
-- authenticated_can_refund = false

-- Historical data remains untouched:
select count(*) as historical_refund_rows
from public.refunds;
