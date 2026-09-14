-- Phase 10 Nominee Portal read-only verification.
-- Run in the correct Girl Pikin For Betteh Supabase project.

-- 1. New portal tables exist.
select
  to_regclass('public.nominee_announcements') as nominee_announcements,
  to_regclass('public.nominee_resources') as nominee_resources,
  to_regclass('public.nominee_ceremony_passes') as nominee_ceremony_passes;

-- 2. Nominee performance and ceremony-pass functions exist.
select
  to_regprocedure(
    'public.get_my_nominee_vote_performance(integer)'
  ) as performance_function,
  to_regprocedure(
    'public.issue_nominee_ceremony_pass(uuid,uuid,uuid,text,text)'
  ) as issue_pass_function,
  to_regprocedure(
    'public.revoke_nominee_ceremony_pass(uuid,text)'
  ) as revoke_pass_function;

-- 3. The secure nominee resource bucket is private.
select
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
from storage.buckets
where id = 'nominee-resources';

-- Expected: public = false

-- 4. Portal content summary.
select
  e.edition_label,
  e.year,
  count(distinct a.id) as announcements,
  count(distinct r.id) as resources
from public.award_editions e
left join public.nominee_announcements a
  on a.award_edition_id = e.id
left join public.nominee_resources r
  on r.award_edition_id = e.id
group by e.id, e.edition_label, e.year
order by e.year desc;

-- 5. Ceremony passes must point to a ticket for the same event.
select
  cp.id as pass_id,
  cp.nominee_id,
  cp.event_id as pass_event_id,
  t.event_id as ticket_event_id,
  cp.status as pass_status,
  t.status as ticket_status
from public.nominee_ceremony_passes cp
join public.tickets t on t.id = cp.ticket_id
where cp.event_id <> t.event_id;

-- Expected: no rows

-- 6. Ceremony passes must match the nominee's award edition.
select
  cp.id as pass_id,
  n.nominee_code,
  n.award_edition_id as nominee_edition_id,
  e.award_edition_id as event_edition_id
from public.nominee_ceremony_passes cp
join public.nominees n on n.id = cp.nominee_id
join public.events e on e.id = cp.event_id
where n.award_edition_id is distinct from e.award_edition_id;

-- Expected: no rows

-- 7. Active nominee passes must have active scanner tickets and
-- a zero-value complimentary order.
select
  cp.id as pass_id,
  n.nominee_code,
  cp.status as pass_status,
  t.status as ticket_status,
  o.status as order_status,
  o.is_complimentary,
  o.total_amount
from public.nominee_ceremony_passes cp
join public.nominees n on n.id = cp.nominee_id
join public.tickets t on t.id = cp.ticket_id
join public.ticket_orders o on o.id = t.ticket_order_id
where cp.status = 'active'
  and (
    t.status <> 'active'
    or o.status <> 'paid'
    or o.is_complimentary <> true
    or o.total_amount <> 0
  );

-- Expected: no rows

-- 8. Complimentary nominee pass orders must not have payment records.
select
  o.id,
  o.order_number,
  count(p.id) as payment_count
from public.ticket_orders o
left join public.payments p on p.ticket_order_id = o.id
where o.is_complimentary = true
group by o.id, o.order_number
having count(p.id) > 0;

-- Expected: no rows

-- 9. No nominee/event pair can have duplicate pass records.
select
  nominee_id,
  event_id,
  count(*) as pass_count
from public.nominee_ceremony_passes
group by nominee_id, event_id
having count(*) > 1;

-- Expected: no rows

-- 10. Recent nominee-portal audit actions.
select
  action,
  entity_type,
  entity_id,
  actor_user_id,
  new_data,
  metadata,
  created_at
from public.audit_logs
where action in (
  'nominee_self_profile_updated',
  'nominee_announcement_created',
  'nominee_announcement_published',
  'nominee_announcement_unpublished',
  'nominee_resource_uploaded',
  'nominee_resource_published',
  'nominee_resource_unpublished',
  'nominee_ceremony_pass_issued',
  'nominee_ceremony_pass_revoked'
)
order by created_at desc
limit 50;
