-- Girl Pikin For Betteh
-- Verify 0027_public_nomination_intake.sql
-- Run AFTER the migration in the LIVE Supabase SQL Editor.

-- 1. Confirm the private application-detail table exists.
select
  to_regclass(
    'public.nominee_application_details'
  ) is not null as details_table_exists;

-- 2. Confirm public browser roles cannot write private details.
select
  has_table_privilege(
    'anon',
    'public.nominee_application_details',
    'SELECT'
  ) as anon_can_read,
  has_table_privilege(
    'anon',
    'public.nominee_application_details',
    'INSERT'
  ) as anon_can_insert,
  has_table_privilege(
    'authenticated',
    'public.nominee_application_details',
    'INSERT'
  ) as authenticated_can_insert;

-- Expected:
-- anon_can_read = false
-- anon_can_insert = false
-- authenticated_can_insert = false

-- 3. Confirm the application-upload bucket is private.
select
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
from storage.buckets
where id = 'nomination-applications';

-- Expected public = false.

-- 4. Show award editions currently able to appear on /apply.
select
  ae.id,
  a.name as award_name,
  ae.edition_label,
  ae.year,
  ae.status,
  ae.is_public,
  count(ac.id) filter (
    where ac.is_active = true
      and ac.is_public = true
  ) as available_categories
from public.award_editions ae
join public.awards a
  on a.id = ae.award_id
left join public.award_categories ac
  on ac.award_edition_id = ae.id
where ae.status = 'nominations_open'
  and ae.is_public = true
group by
  ae.id,
  a.name,
  ae.edition_label,
  ae.year,
  ae.status,
  ae.is_public
order by ae.year desc;
