-- CHECK_0020_AWARDS_RLS_RECOVERY.sql

select
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  p.prosecdef as security_definer
from pg_proc p
join pg_namespace n
  on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'is_my_nominee_edition',
    'is_my_nominee_category'
  )
order by p.proname;

select
  tablename,
  policyname,
  cmd,
  qual
from pg_policies
where schemaname = 'public'
  and policyname in (
    'editions_nominee_read',
    'categories_nominee_read'
  )
order by tablename, policyname;

select
  id,
  year,
  edition_label,
  status,
  is_public,
  voting_starts_at,
  voting_ends_at,
  leaderboard_visibility
from public.award_editions
order by year desc, created_at desc;

select
  vp.award_edition_id,
  ae.edition_label,
  ae.year,
  vp.unit_price,
  vp.currency,
  vp.min_quantity,
  vp.max_quantity,
  vp.quick_quantities,
  vp.is_active
from public.vote_pricing vp
join public.award_editions ae
  on ae.id = vp.award_edition_id
order by ae.year desc;
