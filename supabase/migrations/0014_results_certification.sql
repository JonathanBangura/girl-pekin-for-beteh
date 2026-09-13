-- 0014_results_certification.sql
-- Controlled award-results certification workflow:
-- Voting Closed -> Freeze -> Reconcile -> Review -> Approve -> Publish
--
-- IMPORTANT:
-- No winner is selected automatically.
-- Vote rank is informational only. A results manager must explicitly select
-- the winner for each category during Review.

begin;

create table if not exists public.result_certifications (
  id uuid primary key default gen_random_uuid(),
  award_edition_id uuid not null unique
    references public.award_editions(id) on delete cascade,
  award_name_snapshot text not null,
  award_slug_snapshot text not null,
  edition_label_snapshot text not null,
  year_snapshot integer not null,
  status text not null default 'frozen'
    check (status in (
      'frozen',
      'reconciled',
      'review',
      'approved',
      'published'
    )),
  frozen_at timestamptz not null,
  snapshot_at timestamptz,
  reconciled_at timestamptz,
  reconciled_by uuid references public.profiles(id) on delete set null,
  review_started_at timestamptz,
  review_started_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  approved_by uuid references public.profiles(id) on delete set null,
  published_at timestamptz,
  published_by uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.result_entries (
  id uuid primary key default gen_random_uuid(),
  certification_id uuid not null
    references public.result_certifications(id) on delete cascade,
  award_edition_id uuid not null
    references public.award_editions(id) on delete cascade,
  category_id uuid not null
    references public.award_categories(id) on delete restrict,
  nominee_id uuid not null
    references public.nominees(id) on delete restrict,
  category_name_snapshot text not null,
  nominee_code_snapshot text not null,
  nominee_name_snapshot text not null,
  institution_snapshot text,
  photo_url_snapshot text,
  nominee_status_snapshot text not null,
  eligible boolean not null default false,
  snapshot_votes bigint not null default 0,
  snapshot_rank integer not null check (snapshot_rank > 0),
  decision text not null default 'candidate'
    check (decision in (
      'candidate',
      'winner',
      'runner_up',
      'not_selected',
      'disqualified'
    )),
  decision_note text,
  decided_by uuid references public.profiles(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (certification_id, nominee_id)
);

create unique index if not exists result_entries_one_winner_per_category
  on public.result_entries(certification_id, category_id)
  where decision = 'winner';

create index if not exists result_entries_certification_idx
  on public.result_entries(certification_id, category_id, snapshot_rank);

create index if not exists result_entries_edition_idx
  on public.result_entries(award_edition_id);

drop trigger if exists result_certifications_set_updated_at
  on public.result_certifications;
create trigger result_certifications_set_updated_at
before update on public.result_certifications
for each row execute function public.set_updated_at();

drop trigger if exists result_entries_set_updated_at
  on public.result_entries;
create trigger result_entries_set_updated_at
before update on public.result_entries
for each row execute function public.set_updated_at();

alter table public.result_certifications enable row level security;
alter table public.result_entries enable row level security;

drop policy if exists result_certifications_public_read
  on public.result_certifications;
create policy result_certifications_public_read
on public.result_certifications for select
to anon, authenticated
using (
  status = 'published'
  and exists (
    select 1
    from public.award_editions e
    where e.id = result_certifications.award_edition_id
      and e.is_public = true
      and e.status = 'results_published'
  )
);

drop policy if exists result_certifications_staff_read
  on public.result_certifications;
create policy result_certifications_staff_read
on public.result_certifications for select
to authenticated
using (
  public.has_permission(
    'results.manage',
    'award_edition',
    award_edition_id
  )
  or public.has_permission('audit.read')
);

drop policy if exists result_entries_public_read
  on public.result_entries;
create policy result_entries_public_read
on public.result_entries for select
to anon, authenticated
using (
  exists (
    select 1
    from public.result_certifications rc
    join public.award_editions e
      on e.id = rc.award_edition_id
    where rc.id = result_entries.certification_id
      and rc.status = 'published'
      and e.is_public = true
      and e.status = 'results_published'
  )
);

drop policy if exists result_entries_staff_read
  on public.result_entries;
create policy result_entries_staff_read
on public.result_entries for select
to authenticated
using (
  public.has_permission(
    'results.manage',
    'award_edition',
    award_edition_id
  )
  or public.has_permission('audit.read')
);

grant select on table public.result_certifications
  to anon, authenticated;
grant select on table public.result_entries
  to anon, authenticated;

revoke insert, update, delete
on table public.result_certifications
from anon, authenticated;

revoke insert, update, delete
on table public.result_entries
from anon, authenticated;

create or replace function public.get_results_reconciliation_issues(
  p_award_edition_id uuid
)
returns table (
  issue_code text,
  severity text,
  issue_count bigint,
  issue_message text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_count bigint;
  v_edition public.award_editions%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  if not (
    public.has_permission(
      'results.manage',
      'award_edition',
      p_award_edition_id
    )
    or public.has_permission('audit.read')
  ) then
    raise exception 'Results permission required'
      using errcode = '42501';
  end if;

  select *
    into v_edition
  from public.award_editions
  where id = p_award_edition_id;

  if not found then
    raise exception 'Award edition not found';
  end if;

  -- Provider said completed, but our webhook event has not been cleanly
  -- processed.
  select count(*)
    into v_count
  from public.payment_events pe
  join public.payments p on p.id = pe.payment_id
  join public.vote_orders vo on vo.id = p.vote_order_id
  join public.nominees n on n.id = vo.nominee_id
  where n.award_edition_id = p_award_edition_id
    and p.payment_type = 'vote'
    and pe.event_type = 'completed'
    and (
      pe.processed_at is null
      or pe.processing_error is not null
    );

  if v_count > 0 then
    return query select
      'completed_webhook_unprocessed'::text,
      'critical'::text,
      v_count,
      'One or more completed vote-payment webhooks have not been processed cleanly.'::text;
  end if;

  -- Payment succeeded, but order/ledger settlement is incomplete.
  select count(*)
    into v_count
  from public.payments p
  join public.vote_orders vo on vo.id = p.vote_order_id
  join public.nominees n on n.id = vo.nominee_id
  where n.award_edition_id = p_award_edition_id
    and p.payment_type = 'vote'
    and p.status = 'succeeded'
    and (
      vo.status <> 'paid'
      or not exists (
        select 1
        from public.vote_ledger vl
        where vl.payment_id = p.id
          and vl.entry_type = 'payment'
          and vl.quantity_delta > 0
      )
    );

  if v_count > 0 then
    return query select
      'successful_payment_not_settled'::text,
      'critical'::text,
      v_count,
      'Successful vote payments exist whose vote order or positive vote-ledger allocation is incomplete.'::text;
  end if;

  -- Refund/reversal must have its negative ledger adjustment.
  select count(*)
    into v_count
  from public.payments p
  join public.vote_orders vo on vo.id = p.vote_order_id
  join public.nominees n on n.id = vo.nominee_id
  where n.award_edition_id = p_award_edition_id
    and p.payment_type = 'vote'
    and p.status in ('refunded', 'reversed')
    and not exists (
      select 1
      from public.vote_ledger vl
      where vl.payment_id = p.id
        and vl.entry_type in ('refund', 'reversal')
        and vl.quantity_delta < 0
    );

  if v_count > 0 then
    return query select
      'refund_reversal_missing_ledger'::text,
      'critical'::text,
      v_count,
      'Refunded or reversed vote payments exist without their negative vote-ledger adjustment.'::text;
  end if;

  -- Paid orders must have been created inside the configured voting window.
  if v_edition.voting_starts_at is not null
     or v_edition.voting_ends_at is not null then
    select count(*)
      into v_count
    from public.vote_orders vo
    join public.nominees n on n.id = vo.nominee_id
    where n.award_edition_id = p_award_edition_id
      and vo.status = 'paid'
      and (
        (
          v_edition.voting_starts_at is not null
          and vo.created_at < v_edition.voting_starts_at
        )
        or (
          v_edition.voting_ends_at is not null
          and vo.created_at > v_edition.voting_ends_at
        )
      );

    if v_count > 0 then
      return query select
        'paid_order_outside_voting_window'::text,
        'critical'::text,
        v_count,
        'Paid vote orders exist outside the configured voting window and require investigation.'::text;
    end if;
  end if;

  -- Totals must never become negative.
  select count(*)
    into v_count
  from (
    select
      n.id,
      coalesce(sum(vl.quantity_delta), 0)::bigint as total_votes
    from public.nominees n
    left join public.vote_ledger vl on vl.nominee_id = n.id
    where n.award_edition_id = p_award_edition_id
    group by n.id
    having coalesce(sum(vl.quantity_delta), 0) < 0
  ) negative_totals;

  if v_count > 0 then
    return query select
      'negative_vote_total'::text,
      'critical'::text,
      v_count,
      'One or more nominees have a negative vote total and results must not proceed.'::text;
  end if;

  -- Pending attempts are not counted as votes, but Finance should still know
  -- they exist before certification.
  select count(*)
    into v_count
  from public.payments p
  join public.vote_orders vo on vo.id = p.vote_order_id
  join public.nominees n on n.id = vo.nominee_id
  where n.award_edition_id = p_award_edition_id
    and p.payment_type = 'vote'
    and p.status in ('pending', 'processing')
    and p.created_at < now() - interval '30 minutes';

  if v_count > 0 then
    return query select
      'stale_pending_payments'::text,
      'warning'::text,
      v_count,
      'Stale pending/processing vote payments exist. They are not counted as votes, but should be reviewed by Finance.'::text;
  end if;
end;
$$;

revoke all on function public.get_results_reconciliation_issues(uuid)
from public, anon;

grant execute on function public.get_results_reconciliation_issues(uuid)
to authenticated;

create or replace function public.freeze_award_results(
  p_award_edition_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_edition public.award_editions%rowtype;
  v_certification_id uuid;
  v_frozen_at timestamptz;
  v_award public.awards%rowtype;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  if not public.has_permission(
    'results.manage',
    'award_edition',
    p_award_edition_id
  ) then
    raise exception 'Results permission required'
      using errcode = '42501';
  end if;

  select *
    into v_edition
  from public.award_editions
  where id = p_award_edition_id
  for update;

  if not found then
    raise exception 'Award edition not found';
  end if;

  if v_edition.status <> 'voting_closed' then
    raise exception
      'Voting must be closed before results can be frozen';
  end if;

  select *
    into v_award
  from public.awards
  where id = v_edition.award_id;

  if not found then
    raise exception 'Award not found';
  end if;

  v_frozen_at := coalesce(
    v_edition.leaderboard_frozen_at,
    now()
  );

  update public.award_editions
  set
    leaderboard_visibility = 'frozen',
    leaderboard_frozen_at = v_frozen_at,
    updated_at = now()
  where id = p_award_edition_id;

  insert into public.result_certifications (
    award_edition_id,
    award_name_snapshot,
    award_slug_snapshot,
    edition_label_snapshot,
    year_snapshot,
    status,
    frozen_at,
    created_by
  )
  values (
    p_award_edition_id,
    v_award.name,
    v_award.slug,
    v_edition.edition_label,
    v_edition.year,
    'frozen',
    v_frozen_at,
    v_user_id
  )
  on conflict (award_edition_id)
  do update set
    frozen_at = coalesce(
      public.result_certifications.frozen_at,
      excluded.frozen_at
    ),
    updated_at = now()
  returning id into v_certification_id;

  insert into public.audit_logs (
    actor_user_id,
    action,
    entity_type,
    entity_id,
    new_data,
    metadata
  )
  values (
    v_user_id,
    'award_results_frozen',
    'result_certification',
    v_certification_id,
    jsonb_build_object(
      'award_edition_id', p_award_edition_id,
      'frozen_at', v_frozen_at
    ),
    '{}'::jsonb
  );

  return v_certification_id;
end;
$$;

revoke all on function public.freeze_award_results(uuid)
from public, anon;

grant execute on function public.freeze_award_results(uuid)
to authenticated;

create or replace function public.reconcile_award_results(
  p_award_edition_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_edition public.award_editions%rowtype;
  v_certification public.result_certifications%rowtype;
  v_critical_count bigint;
  v_snapshot_at timestamptz;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  if not public.has_permission(
    'results.manage',
    'award_edition',
    p_award_edition_id
  ) then
    raise exception 'Results permission required'
      using errcode = '42501';
  end if;

  select *
    into v_edition
  from public.award_editions
  where id = p_award_edition_id
  for update;

  if not found then
    raise exception 'Award edition not found';
  end if;

  if v_edition.status not in ('voting_closed', 'results_review') then
    raise exception
      'Results can only be reconciled after voting is closed';
  end if;

  if v_edition.leaderboard_visibility <> 'frozen'
     or v_edition.leaderboard_frozen_at is null then
    raise exception 'Results must be frozen before reconciliation';
  end if;

  select *
    into v_certification
  from public.result_certifications
  where award_edition_id = p_award_edition_id
  for update;

  if not found then
    raise exception 'Freeze results before reconciliation';
  end if;

  if v_certification.status in ('approved', 'published') then
    raise exception
      'Approved or published results cannot be reconciled again';
  end if;

  select coalesce(sum(issue_count), 0)
    into v_critical_count
  from public.get_results_reconciliation_issues(
    p_award_edition_id
  )
  where severity = 'critical';

  if v_critical_count > 0 then
    raise exception
      'RESULTS_RECONCILIATION_BLOCKED:% critical issue(s)',
      v_critical_count;
  end if;

  v_snapshot_at := now();

  delete from public.result_entries
  where certification_id = v_certification.id;

  with totals as (
    select
      n.id as nominee_id,
      n.category_id,
      c.name as category_name,
      n.nominee_code,
      n.full_name as nominee_name,
      n.institution,
      n.photo_url,
      n.status as nominee_status,
      n.is_public,
      coalesce(sum(vl.quantity_delta), 0)::bigint
        as snapshot_votes
    from public.nominees n
    join public.award_categories c
      on c.id = n.category_id
    left join public.vote_ledger vl
      on vl.nominee_id = n.id
    where n.award_edition_id = p_award_edition_id
    group by
      n.id,
      n.category_id,
      c.name,
      n.nominee_code,
      n.full_name,
      n.institution,
      n.photo_url,
      n.status,
      n.is_public
  ),
  ranked as (
    select
      t.*,
      dense_rank() over (
        partition by t.category_id
        order by t.snapshot_votes desc
      )::integer as snapshot_rank
    from totals t
  )
  insert into public.result_entries (
    certification_id,
    award_edition_id,
    category_id,
    nominee_id,
    category_name_snapshot,
    nominee_code_snapshot,
    nominee_name_snapshot,
    institution_snapshot,
    photo_url_snapshot,
    nominee_status_snapshot,
    eligible,
    snapshot_votes,
    snapshot_rank,
    decision
  )
  select
    v_certification.id,
    p_award_edition_id,
    r.category_id,
    r.nominee_id,
    r.category_name,
    r.nominee_code,
    r.nominee_name,
    r.institution,
    r.photo_url,
    r.nominee_status,
    (
      r.nominee_status = 'published'
      and r.is_public = true
    ),
    r.snapshot_votes,
    r.snapshot_rank,
    case
      when (
        r.nominee_status = 'published'
        and r.is_public = true
      )
      then 'candidate'
      else 'disqualified'
    end
  from ranked r;

  update public.result_certifications
  set
    status = 'reconciled',
    snapshot_at = v_snapshot_at,
    reconciled_at = v_snapshot_at,
    reconciled_by = v_user_id,
    review_started_at = null,
    review_started_by = null,
    approved_at = null,
    approved_by = null,
    published_at = null,
    published_by = null,
    updated_at = now()
  where id = v_certification.id;

  insert into public.audit_logs (
    actor_user_id,
    action,
    entity_type,
    entity_id,
    new_data,
    metadata
  )
  values (
    v_user_id,
    'award_results_reconciled',
    'result_certification',
    v_certification.id,
    jsonb_build_object(
      'award_edition_id', p_award_edition_id,
      'snapshot_at', v_snapshot_at
    ),
    jsonb_build_object(
      'winner_selection_reset', true
    )
  );

  return v_certification.id;
end;
$$;

revoke all on function public.reconcile_award_results(uuid)
from public, anon;

grant execute on function public.reconcile_award_results(uuid)
to authenticated;

create or replace function public.start_award_results_review(
  p_award_edition_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_certification public.result_certifications%rowtype;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  if not public.has_permission(
    'results.manage',
    'award_edition',
    p_award_edition_id
  ) then
    raise exception 'Results permission required'
      using errcode = '42501';
  end if;

  select *
    into v_certification
  from public.result_certifications
  where award_edition_id = p_award_edition_id
  for update;

  if not found or v_certification.status <> 'reconciled' then
    raise exception 'Reconcile results before starting review';
  end if;

  update public.result_certifications
  set
    status = 'review',
    review_started_at = now(),
    review_started_by = v_user_id,
    updated_at = now()
  where id = v_certification.id;

  update public.award_editions
  set
    status = 'results_review',
    updated_at = now()
  where id = p_award_edition_id;

  insert into public.audit_logs (
    actor_user_id,
    action,
    entity_type,
    entity_id,
    new_data,
    metadata
  )
  values (
    v_user_id,
    'award_results_review_started',
    'result_certification',
    v_certification.id,
    jsonb_build_object(
      'award_edition_id', p_award_edition_id
    ),
    '{}'::jsonb
  );

  return v_certification.id;
end;
$$;

revoke all on function public.start_award_results_review(uuid)
from public, anon;

grant execute on function public.start_award_results_review(uuid)
to authenticated;

create or replace function public.set_award_result_winner(
  p_award_edition_id uuid,
  p_category_id uuid,
  p_nominee_id uuid,
  p_is_winner boolean,
  p_decision_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_certification public.result_certifications%rowtype;
  v_entry public.result_entries%rowtype;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  if not public.has_permission(
    'results.manage',
    'award_edition',
    p_award_edition_id
  ) then
    raise exception 'Results permission required'
      using errcode = '42501';
  end if;

  select *
    into v_certification
  from public.result_certifications
  where award_edition_id = p_award_edition_id
  for update;

  if not found or v_certification.status <> 'review' then
    raise exception 'Winner selection is available only during Results Review';
  end if;

  select *
    into v_entry
  from public.result_entries
  where certification_id = v_certification.id
    and award_edition_id = p_award_edition_id
    and category_id = p_category_id
    and nominee_id = p_nominee_id
  for update;

  if not found then
    raise exception 'Result entry not found';
  end if;

  if p_is_winner and not v_entry.eligible then
    raise exception 'This nominee is not eligible to be selected as winner';
  end if;

  if p_is_winner then
    update public.result_entries
    set
      decision = 'candidate',
      decision_note = null,
      decided_by = null,
      decided_at = null,
      updated_at = now()
    where certification_id = v_certification.id
      and category_id = p_category_id
      and decision = 'winner';

    update public.result_entries
    set
      decision = 'winner',
      decision_note = nullif(
        trim(coalesce(p_decision_note, '')),
        ''
      ),
      decided_by = v_user_id,
      decided_at = now(),
      updated_at = now()
    where id = v_entry.id;
  else
    update public.result_entries
    set
      decision = 'candidate',
      decision_note = null,
      decided_by = null,
      decided_at = null,
      updated_at = now()
    where id = v_entry.id
      and decision = 'winner';
  end if;

  insert into public.audit_logs (
    actor_user_id,
    action,
    entity_type,
    entity_id,
    new_data,
    metadata
  )
  values (
    v_user_id,
    case
      when p_is_winner
        then 'award_result_winner_selected'
      else 'award_result_winner_cleared'
    end,
    'result_entry',
    v_entry.id,
    jsonb_build_object(
      'award_edition_id', p_award_edition_id,
      'category_id', p_category_id,
      'nominee_id', p_nominee_id,
      'winner', p_is_winner,
      'decision_note', nullif(
        trim(coalesce(p_decision_note, '')),
        ''
      )
    ),
    '{}'::jsonb
  );
end;
$$;

revoke all on function public.set_award_result_winner(
  uuid, uuid, uuid, boolean, text
) from public, anon;

grant execute on function public.set_award_result_winner(
  uuid, uuid, uuid, boolean, text
) to authenticated;

create or replace function public.approve_award_results(
  p_award_edition_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_certification public.result_certifications%rowtype;
  v_critical_count bigint;
  v_new_ledger_count bigint;
  v_required_categories bigint;
  v_winner_categories bigint;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  if not public.has_permission(
    'results.manage',
    'award_edition',
    p_award_edition_id
  ) then
    raise exception 'Results permission required'
      using errcode = '42501';
  end if;

  select *
    into v_certification
  from public.result_certifications
  where award_edition_id = p_award_edition_id
  for update;

  if not found or v_certification.status <> 'review' then
    raise exception 'Results must be in Review before approval';
  end if;

  select coalesce(sum(issue_count), 0)
    into v_critical_count
  from public.get_results_reconciliation_issues(
    p_award_edition_id
  )
  where severity = 'critical';

  if v_critical_count > 0 then
    raise exception
      'RESULTS_APPROVAL_BLOCKED:% critical reconciliation issue(s)',
      v_critical_count;
  end if;

  select count(*)
    into v_new_ledger_count
  from public.vote_ledger vl
  join public.nominees n on n.id = vl.nominee_id
  where n.award_edition_id = p_award_edition_id
    and vl.created_at > v_certification.snapshot_at;

  if v_new_ledger_count > 0 then
    raise exception
      'RESULTS_SNAPSHOT_STALE:% vote-ledger change(s) occurred after reconciliation',
      v_new_ledger_count;
  end if;

  select count(*)
    into v_required_categories
  from public.award_categories c
  where c.award_edition_id = p_award_edition_id
    and c.is_active = true
    and c.is_public = true
    and exists (
      select 1
      from public.result_entries re
      where re.certification_id = v_certification.id
        and re.category_id = c.id
        and re.eligible = true
    );

  select count(distinct re.category_id)
    into v_winner_categories
  from public.result_entries re
  where re.certification_id = v_certification.id
    and re.decision = 'winner'
    and re.eligible = true;

  if v_required_categories = 0 then
    raise exception
      'RESULTS_NO_ELIGIBLE_CATEGORIES:No eligible public categories are available for certification';
  end if;

  if v_winner_categories <> v_required_categories then
    raise exception
      'RESULTS_WINNERS_INCOMPLETE:% of % required categories have a selected winner',
      v_winner_categories,
      v_required_categories;
  end if;

  update public.result_certifications
  set
    status = 'approved',
    approved_at = now(),
    approved_by = v_user_id,
    updated_at = now()
  where id = v_certification.id;

  insert into public.audit_logs (
    actor_user_id,
    action,
    entity_type,
    entity_id,
    new_data,
    metadata
  )
  values (
    v_user_id,
    'award_results_approved',
    'result_certification',
    v_certification.id,
    jsonb_build_object(
      'award_edition_id', p_award_edition_id,
      'winner_categories', v_winner_categories
    ),
    '{}'::jsonb
  );

  return v_certification.id;
end;
$$;

revoke all on function public.approve_award_results(uuid)
from public, anon;

grant execute on function public.approve_award_results(uuid)
to authenticated;

create or replace function public.publish_award_results(
  p_award_edition_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_certification public.result_certifications%rowtype;
  v_critical_count bigint;
  v_new_ledger_count bigint;
  v_published_at timestamptz;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  if not public.has_permission(
    'results.manage',
    'award_edition',
    p_award_edition_id
  ) then
    raise exception 'Results permission required'
      using errcode = '42501';
  end if;

  select *
    into v_certification
  from public.result_certifications
  where award_edition_id = p_award_edition_id
  for update;

  if not found or v_certification.status <> 'approved' then
    raise exception 'Results must be approved before publication';
  end if;

  select coalesce(sum(issue_count), 0)
    into v_critical_count
  from public.get_results_reconciliation_issues(
    p_award_edition_id
  )
  where severity = 'critical';

  if v_critical_count > 0 then
    raise exception
      'RESULTS_PUBLICATION_BLOCKED:% critical reconciliation issue(s)',
      v_critical_count;
  end if;

  select count(*)
    into v_new_ledger_count
  from public.vote_ledger vl
  join public.nominees n on n.id = vl.nominee_id
  where n.award_edition_id = p_award_edition_id
    and vl.created_at > v_certification.snapshot_at;

  if v_new_ledger_count > 0 then
    raise exception
      'RESULTS_SNAPSHOT_STALE:% vote-ledger change(s) occurred after reconciliation',
      v_new_ledger_count;
  end if;

  v_published_at := now();

  update public.result_certifications
  set
    status = 'published',
    published_at = v_published_at,
    published_by = v_user_id,
    updated_at = now()
  where id = v_certification.id;

  update public.award_editions
  set
    status = 'results_published',
    results_published_at = v_published_at,
    leaderboard_visibility = 'frozen',
    updated_at = now()
  where id = p_award_edition_id;

  insert into public.audit_logs (
    actor_user_id,
    action,
    entity_type,
    entity_id,
    new_data,
    metadata
  )
  values (
    v_user_id,
    'award_results_published',
    'result_certification',
    v_certification.id,
    jsonb_build_object(
      'award_edition_id', p_award_edition_id,
      'published_at', v_published_at
    ),
    '{}'::jsonb
  );

  return v_certification.id;
end;
$$;

revoke all on function public.publish_award_results(uuid)
from public, anon;

grant execute on function public.publish_award_results(uuid)
to authenticated;

commit;
