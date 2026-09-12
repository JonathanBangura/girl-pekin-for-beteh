-- Read-only check. Run in the correct Supabase project.

select
  e.id,
  a.name as award_name,
  e.edition_label,
  e.year,
  e.status,
  e.is_public,
  e.voting_starts_at,
  e.voting_ends_at
from public.award_editions e
join public.awards a on a.id = e.award_id
order by e.year desc, e.created_at desc;

-- Expected seeded row:
-- 50 Most Influential Students' Award – Sierra Leone
-- 6th Edition
-- 2026
-- voting_closed
-- true
