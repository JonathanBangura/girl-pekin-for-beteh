-- Girl Pikin For Betteh
-- V1 Closeout: disable refund/reversal operations.
--
-- Version 1 business decision:
-- - no vote refunds
-- - no ticket refunds
--
-- This migration intentionally preserves:
-- - public.refunds
-- - record_external_full_refund(...)
-- - historical refund/audit records
-- - reporting compatibility
--
-- It only removes authenticated-user execution permission.
-- A future version can re-enable the existing function with an explicit GRANT.

begin;

revoke execute
on function public.record_external_full_refund(
  uuid,
  text,
  text,
  text,
  text,
  text
)
from authenticated;

revoke execute
on function public.record_external_full_refund(
  uuid,
  text,
  text,
  text,
  text,
  text
)
from anon;

revoke execute
on function public.record_external_full_refund(
  uuid,
  text,
  text,
  text,
  text,
  text
)
from public;

commit;
