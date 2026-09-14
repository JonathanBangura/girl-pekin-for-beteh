-- 0018_nomination_review.sql
-- Completes the agreed nomination review lifecycle without creating a second
-- competing application model. Applications are nominee records in review states.

begin;

alter table public.nominees
  add column if not exists submitted_at timestamptz,
  add column if not exists review_started_at timestamptz,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid
    references public.profiles(id) on delete set null,
  add column if not exists review_note text;

alter table public.nominees
  drop constraint if exists nominees_status_check;

alter table public.nominees
  add constraint nominees_status_check
  check (status in (
    'draft',
    'submitted',
    'under_review',
    'approved',
    'rejected',
    'published',
    'suspended',
    'disqualified',
    'withdrawn',
    'archived'
  ));

create table if not exists public.nominee_application_reviews (
  id uuid primary key default gen_random_uuid(),
  nominee_id uuid not null
    references public.nominees(id) on delete cascade,
  award_edition_id uuid not null
    references public.award_editions(id) on delete cascade,
  from_status text not null,
  to_status text not null,
  note text,
  reviewer_user_id uuid
    references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists nominee_application_reviews_nominee_idx
  on public.nominee_application_reviews(
    nominee_id,
    created_at desc
  );

create index if not exists nominee_application_reviews_edition_idx
  on public.nominee_application_reviews(
    award_edition_id,
    created_at desc
  );

create or replace function public.set_nominee_lifecycle_timestamps()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'submitted' and new.submitted_at is null then
      new.submitted_at := now();
    end if;

    if new.status = 'under_review'
      and new.review_started_at is null then
      new.review_started_at := now();
    end if;

    if new.status in ('approved', 'rejected', 'withdrawn')
      and new.reviewed_at is null then
      new.reviewed_at := now();
    end if;

    return new;
  end if;

  if new.status is distinct from old.status then
    if new.status = 'submitted' then
      new.submitted_at := coalesce(
        new.submitted_at,
        now()
      );
      new.review_started_at := null;
      new.reviewed_at := null;
      new.reviewed_by := null;
      new.review_note := null;
    elsif new.status = 'under_review' then
      new.review_started_at := now();
      new.reviewed_at := null;
    elsif new.status in (
      'approved',
      'rejected',
      'withdrawn'
    ) then
      new.reviewed_at := now();
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists nominees_lifecycle_timestamps
  on public.nominees;

create trigger nominees_lifecycle_timestamps
before insert or update of status
on public.nominees
for each row
execute function public.set_nominee_lifecycle_timestamps();

alter table public.nominee_application_reviews
  enable row level security;

drop policy if exists nominee_application_reviews_staff_read
  on public.nominee_application_reviews;

create policy nominee_application_reviews_staff_read
on public.nominee_application_reviews for select
to authenticated
using (
  public.has_permission(
    'nominations.review',
    'award_edition',
    award_edition_id
  )
  or public.has_permission(
    'awards.manage',
    'award_edition',
    award_edition_id
  )
  or public.has_permission('audit.read')
);

grant select
on public.nominee_application_reviews
to authenticated;

revoke insert, update, delete
on public.nominee_application_reviews
from anon, authenticated;

commit;
