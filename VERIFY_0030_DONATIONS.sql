-- GPFB — VERIFY 0030 DONATIONS / FUNDRAISING CORE
-- Run after 0030_donations_fundraising_core.sql.
-- Read-only checks only.

-- 1. Tables exist.
select
  to_regclass('public.donation_campaigns') as donation_campaigns,
  to_regclass('public.donations') as donations;

-- 2. payments.donation_id exists.
select
  column_name,
  data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'payments'
  and column_name = 'donation_id';

-- 3. General Fund was seeded and is public/active.
select
  slug,
  title,
  campaign_kind,
  fund_type,
  status,
  is_public,
  minimum_amount,
  currency
from public.donation_campaigns
where slug = 'general-fund';

-- 4. Public campaign RPC returns the General Fund.
select *
from public.get_public_donation_campaigns('general-fund');

-- 5. Fundraising permissions/role exist.
select
  r.code as role_code,
  p.code as permission_code
from public.role_permissions rp
join public.roles r
  on r.id = rp.role_id
join public.permissions p
  on p.id = rp.permission_id
where r.code in (
  'super_admin',
  'fundraising_manager',
  'finance_officer',
  'auditor'
)
  and p.code in (
    'admin.access',
    'donations.read',
    'donations.manage'
  )
order by r.code, p.code;

-- 6. Internal RPCs are present.
select
  p.proname,
  pg_get_function_identity_arguments(p.oid) as arguments,
  p.proconfig
from pg_proc p
join pg_namespace n
  on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'create_donation_order',
    'mark_donation_payment_success',
    'get_public_donation_campaigns',
    'get_public_donation_receipt',
    'donation_report_summary',
    'get_public_vult_payment_status'
  )
order by p.proname;

-- 7. Confirm no direct public table grants were introduced.
select
  grantee,
  table_name,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('donation_campaigns', 'donations')
  and grantee in ('anon', 'authenticated')
order by table_name, grantee, privilege_type;

-- Expected: no rows for step 7.
