-- Phase 8 Results Certification read-only verification.
-- Run in the correct Girl Pikin For Betteh Supabase project.

-- 1. Results tables exist.
select
  to_regclass('public.result_certifications')
    as result_certifications,
  to_regclass('public.result_entries')
    as result_entries;

-- 2. Required workflow functions exist.
select
  to_regprocedure('public.freeze_award_results(uuid)')
    as freeze_results,
  to_regprocedure('public.reconcile_award_results(uuid)')
    as reconcile_results,
  to_regprocedure('public.start_award_results_review(uuid)')
    as start_review,
  to_regprocedure(
    'public.set_award_result_winner(uuid,uuid,uuid,boolean,text)'
  ) as set_winner,
  to_regprocedure('public.approve_award_results(uuid)')
    as approve_results,
  to_regprocedure('public.publish_award_results(uuid)')
    as publish_results;

-- 3. Certification status by edition.
select
  a.name as award_name,
  e.edition_label,
  e.year,
  e.status as edition_status,
  e.leaderboard_visibility,
  e.leaderboard_frozen_at,
  rc.status as certification_status,
  rc.frozen_at,
  rc.snapshot_at,
  rc.reconciled_at,
  rc.review_started_at,
  rc.approved_at,
  rc.published_at
from public.award_editions e
join public.awards a on a.id = e.award_id
left join public.result_certifications rc
  on rc.award_edition_id = e.id
order by e.year desc;

-- 4. Snapshot entries and decisions.
select
  rc.status as certification_status,
  re.category_name_snapshot,
  re.nominee_code_snapshot,
  re.nominee_name_snapshot,
  re.eligible,
  re.snapshot_votes,
  re.snapshot_rank,
  re.decision,
  re.decision_note
from public.result_entries re
join public.result_certifications rc
  on rc.id = re.certification_id
order by
  re.category_name_snapshot,
  re.snapshot_rank,
  re.nominee_code_snapshot;

-- 5. No category can have more than one certified winner.
select
  certification_id,
  category_id,
  count(*) as winner_count
from public.result_entries
where decision = 'winner'
group by certification_id, category_id
having count(*) > 1;

-- 6. Published certifications must have exactly one winner for every
-- eligible public active category.
with required as (
  select
    rc.id as certification_id,
    count(distinct c.id) as required_categories
  from public.result_certifications rc
  join public.award_categories c
    on c.award_edition_id = rc.award_edition_id
   and c.is_public = true
   and c.is_active = true
  where rc.status = 'published'
    and exists (
      select 1
      from public.result_entries re
      where re.certification_id = rc.id
        and re.category_id = c.id
        and re.eligible = true
    )
  group by rc.id
),
selected as (
  select
    certification_id,
    count(distinct category_id) as winner_categories
  from public.result_entries
  where decision = 'winner'
    and eligible = true
  group by certification_id
)
select
  r.certification_id,
  r.required_categories,
  coalesce(s.winner_categories, 0) as winner_categories
from required r
left join selected s
  on s.certification_id = r.certification_id
where r.required_categories
  <> coalesce(s.winner_categories, 0);

-- 7. Approved/published snapshots must not have later vote-ledger changes.
select
  rc.id as certification_id,
  rc.status,
  rc.snapshot_at,
  count(vl.id) as later_ledger_entries
from public.result_certifications rc
join public.nominees n
  on n.award_edition_id = rc.award_edition_id
join public.vote_ledger vl
  on vl.nominee_id = n.id
 and vl.created_at > rc.snapshot_at
where rc.status in ('approved', 'published')
group by rc.id, rc.status, rc.snapshot_at
having count(vl.id) > 0;

-- 8. Published results must match edition publication state.
select
  rc.id,
  rc.status as certification_status,
  e.status as edition_status,
  rc.published_at,
  e.results_published_at
from public.result_certifications rc
join public.award_editions e
  on e.id = rc.award_edition_id
where (
  rc.status = 'published'
  and (
    e.status <> 'results_published'
    or e.results_published_at is null
  )
)
or (
  e.status = 'results_published'
  and rc.status <> 'published'
);

-- 9. Recent results audit trail.
select
  action,
  entity_type,
  entity_id,
  actor_user_id,
  new_data,
  metadata,
  created_at
from public.audit_logs
where action like 'award_result%'
order by created_at desc
limit 50;
