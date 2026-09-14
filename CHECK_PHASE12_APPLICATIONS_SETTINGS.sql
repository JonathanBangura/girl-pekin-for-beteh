-- Phase 12 Applications + Settings verification.

-- 1. Rejected is now a valid nominee lifecycle state and review fields exist.
select
  column_name,
  data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'nominees'
  and column_name in (
    'submitted_at',
    'review_started_at',
    'reviewed_at',
    'reviewed_by',
    'review_note'
  )
order by column_name;

-- 2. Review history table exists.
select
  to_regclass('public.nominee_application_reviews')
    as nominee_application_reviews;

-- 3. Review queue by status.
select
  ae.edition_label,
  ae.year,
  n.status,
  count(*) as nominee_count
from public.nominees n
join public.award_editions ae
  on ae.id = n.award_edition_id
where n.status in (
  'submitted',
  'under_review',
  'approved',
  'rejected',
  'withdrawn'
)
group by ae.id, ae.edition_label, ae.year, n.status
order by ae.year desc, n.status;

-- 4. Approved/rejected/withdrawn records should have a decision timestamp
-- when transitioned through the Phase 12 review action.
select
  id,
  nominee_code,
  status,
  reviewed_at,
  reviewed_by,
  review_note
from public.nominees
where status in ('approved', 'rejected', 'withdrawn')
order by updated_at desc;

-- 5. Review history.
select
  nominee_id,
  from_status,
  to_status,
  note,
  reviewer_user_id,
  created_at
from public.nominee_application_reviews
order by created_at desc
limit 50;

-- 6. Recent application audit trail.
select
  action,
  entity_type,
  entity_id,
  actor_user_id,
  old_data,
  new_data,
  created_at
from public.audit_logs
where action like 'nominee_application_%'
order by created_at desc
limit 50;
