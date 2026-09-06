-- seed.sql
-- Confirmed 2026 award/event data only. No unverified categories or nominees are created.

begin;

with award_row as (
  insert into public.awards (
    slug,
    name,
    summary,
    status
  )
  values (
    '50-most-influential-students-award-sierra-leone',
    '50 Most Influential Students'' Award – Sierra Leone',
    'Student recognition award platform edition.',
    'published'
  )
  on conflict (slug) do update
  set name = excluded.name,
      summary = excluded.summary,
      status = excluded.status,
      updated_at = now()
  returning id
),
edition_row as (
  insert into public.award_editions (
    award_id,
    year,
    edition_number,
    edition_label,
    status,
    is_public,
    voting_starts_at,
    voting_ends_at,
    leaderboard_visibility
  )
  select
    id,
    2026,
    6,
    '6th Edition',
    'voting_closed',
    true,
    timestamptz '2026-06-20 21:00:00+00',
    timestamptz '2026-07-20 21:00:00+00',
    'visible'
  from award_row
  on conflict (award_id, year) do update
  set edition_number = excluded.edition_number,
      edition_label = excluded.edition_label,
      status = excluded.status,
      is_public = excluded.is_public,
      voting_starts_at = excluded.voting_starts_at,
      voting_ends_at = excluded.voting_ends_at,
      leaderboard_visibility = excluded.leaderboard_visibility,
      updated_at = now()
  returning id
),
event_row as (
  insert into public.events (
    award_edition_id,
    slug,
    title,
    summary,
    venue,
    starts_at,
    access_type,
    status,
    is_public
  )
  select
    id,
    '50misa-2026',
    '50 Most Influential Students'' Award – Sierra Leone 2026 Ceremony',
    '6th Edition award ceremony.',
    'Freetown City Hall',
    timestamptz '2026-11-21 17:00:00+00',
    'paid',
    'published',
    true
  from edition_row
  on conflict (slug) do update
  set award_edition_id = excluded.award_edition_id,
      title = excluded.title,
      summary = excluded.summary,
      venue = excluded.venue,
      starts_at = excluded.starts_at,
      access_type = excluded.access_type,
      status = excluded.status,
      is_public = excluded.is_public,
      updated_at = now()
  returning id
)
insert into public.ticket_types (
  event_id,
  name,
  pricing_type,
  price,
  min_donation,
  currency,
  admissions_per_unit,
  is_active,
  sort_order
)
select id, 'Diploma', 'fixed', 250, null, 'SLE', 1, true, 10 from event_row
union all
select id, 'Degree', 'fixed', 500, null, 'SLE', 1, true, 20 from event_row
union all
select id, 'Masters', 'fixed', 1000, null, 'SLE', 1, true, 30 from event_row
union all
select id, 'PhD', 'donation', null, 0, 'SLE', 1, true, 40 from event_row
on conflict (event_id, name) do update
set pricing_type = excluded.pricing_type,
    price = excluded.price,
    min_donation = excluded.min_donation,
    currency = excluded.currency,
    admissions_per_unit = excluded.admissions_per_unit,
    is_active = excluded.is_active,
    sort_order = excluded.sort_order,
    updated_at = now();

commit;
