-- 0016_nominee_portal_completion.sql
-- Live nominee portal content, secure resources, performance summaries
-- and scanner-compatible complimentary nominee ceremony passes.

begin;

create table if not exists public.nominee_announcements (
  id uuid primary key default gen_random_uuid(),
  award_edition_id uuid not null
    references public.award_editions(id) on delete cascade,
  title text not null,
  body text not null,
  priority text not null default 'information'
    check (priority in ('information', 'important', 'urgent')),
  is_published boolean not null default false,
  published_at timestamptz,
  expires_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    expires_at is null
    or published_at is null
    or expires_at > published_at
  )
);

create index if not exists nominee_announcements_edition_idx
  on public.nominee_announcements(
    award_edition_id,
    is_published,
    published_at desc
  );

create table if not exists public.nominee_resources (
  id uuid primary key default gen_random_uuid(),
  award_edition_id uuid not null
    references public.award_editions(id) on delete cascade,
  title text not null,
  description text,
  resource_type text not null default 'document'
    check (resource_type in (
      'document',
      'campaign_asset',
      'ceremony'
    )),
  storage_bucket text not null default 'nominee-resources',
  storage_path text not null unique,
  original_filename text,
  mime_type text,
  file_size_bytes bigint
    check (file_size_bytes is null or file_size_bytes >= 0),
  is_published boolean not null default false,
  published_at timestamptz,
  expires_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    expires_at is null
    or published_at is null
    or expires_at > published_at
  )
);

create index if not exists nominee_resources_edition_idx
  on public.nominee_resources(
    award_edition_id,
    resource_type,
    is_published,
    published_at desc
  );

alter table public.ticket_orders
  add column if not exists is_complimentary boolean not null default false,
  add column if not exists complimentary_reason text,
  add column if not exists complimentary_by uuid
    references public.profiles(id) on delete set null;

create table if not exists public.nominee_ceremony_passes (
  id uuid primary key default gen_random_uuid(),
  nominee_id uuid not null
    references public.nominees(id) on delete cascade,
  event_id uuid not null
    references public.events(id) on delete cascade,
  ticket_id uuid not null unique
    references public.tickets(id) on delete restrict,
  status text not null default 'active'
    check (status in ('active', 'revoked')),
  issued_by uuid references public.profiles(id) on delete set null,
  issued_at timestamptz not null default now(),
  revoked_by uuid references public.profiles(id) on delete set null,
  revoked_at timestamptz,
  revoke_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (nominee_id, event_id)
);

create index if not exists nominee_ceremony_passes_nominee_idx
  on public.nominee_ceremony_passes(nominee_id, status);

create index if not exists nominee_ceremony_passes_event_idx
  on public.nominee_ceremony_passes(event_id, status);

drop trigger if exists nominee_announcements_set_updated_at
  on public.nominee_announcements;
create trigger nominee_announcements_set_updated_at
before update on public.nominee_announcements
for each row execute function public.set_updated_at();

drop trigger if exists nominee_resources_set_updated_at
  on public.nominee_resources;
create trigger nominee_resources_set_updated_at
before update on public.nominee_resources
for each row execute function public.set_updated_at();

drop trigger if exists nominee_ceremony_passes_set_updated_at
  on public.nominee_ceremony_passes;
create trigger nominee_ceremony_passes_set_updated_at
before update on public.nominee_ceremony_passes
for each row execute function public.set_updated_at();

alter table public.nominee_announcements enable row level security;
alter table public.nominee_resources enable row level security;
alter table public.nominee_ceremony_passes enable row level security;

drop policy if exists nominee_announcements_own_read
  on public.nominee_announcements;
create policy nominee_announcements_own_read
on public.nominee_announcements for select
to authenticated
using (
  public.has_permission('nominee.portal')
  and is_published = true
  and coalesce(published_at, now()) <= now()
  and (expires_at is null or expires_at > now())
  and exists (
    select 1
    from public.nominees n
    where n.award_edition_id = nominee_announcements.award_edition_id
      and n.auth_user_id = auth.uid()
  )
);

drop policy if exists nominee_announcements_staff_read
  on public.nominee_announcements;
create policy nominee_announcements_staff_read
on public.nominee_announcements for select
to authenticated
using (
  public.has_permission(
    'awards.manage',
    'award_edition',
    award_edition_id
  )
  or public.has_permission(
    'nominations.review',
    'award_edition',
    award_edition_id
  )
  or public.has_permission('audit.read')
);

drop policy if exists nominee_resources_own_read
  on public.nominee_resources;
create policy nominee_resources_own_read
on public.nominee_resources for select
to authenticated
using (
  public.has_permission('nominee.portal')
  and is_published = true
  and coalesce(published_at, now()) <= now()
  and (expires_at is null or expires_at > now())
  and exists (
    select 1
    from public.nominees n
    where n.award_edition_id = nominee_resources.award_edition_id
      and n.auth_user_id = auth.uid()
  )
);

drop policy if exists nominee_resources_staff_read
  on public.nominee_resources;
create policy nominee_resources_staff_read
on public.nominee_resources for select
to authenticated
using (
  public.has_permission(
    'awards.manage',
    'award_edition',
    award_edition_id
  )
  or public.has_permission(
    'nominations.review',
    'award_edition',
    award_edition_id
  )
  or public.has_permission('audit.read')
);

drop policy if exists nominee_ceremony_passes_own_read
  on public.nominee_ceremony_passes;
create policy nominee_ceremony_passes_own_read
on public.nominee_ceremony_passes for select
to authenticated
using (
  public.has_permission('nominee.portal')
  and exists (
    select 1
    from public.nominees n
    where n.id = nominee_ceremony_passes.nominee_id
      and n.auth_user_id = auth.uid()
  )
);

drop policy if exists nominee_ceremony_passes_staff_read
  on public.nominee_ceremony_passes;
create policy nominee_ceremony_passes_staff_read
on public.nominee_ceremony_passes for select
to authenticated
using (
  public.has_permission(
    'events.manage',
    'event',
    event_id
  )
  or exists (
    select 1
    from public.nominees n
    where n.id = nominee_ceremony_passes.nominee_id
      and public.has_permission(
        'awards.manage',
        'award_edition',
        n.award_edition_id
      )
  )
  or public.has_permission('audit.read')
);

grant select on table public.nominee_announcements
  to authenticated;
grant select on table public.nominee_resources
  to authenticated;
grant select on table public.nominee_ceremony_passes
  to authenticated;

revoke insert, update, delete
on table public.nominee_announcements
from anon, authenticated;

revoke insert, update, delete
on table public.nominee_resources
from anon, authenticated;

revoke insert, update, delete
on table public.nominee_ceremony_passes
from anon, authenticated;


create or replace function public.get_my_nominee_vote_summary()
returns table (
  nominee_id uuid,
  nominee_code text,
  total_votes bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    n.id,
    n.nominee_code,
    coalesce(sum(vl.quantity_delta), 0)::bigint
  from public.nominees n
  left join public.vote_ledger vl
    on vl.nominee_id = n.id
  where n.auth_user_id = auth.uid()
    and public.has_permission('nominee.portal')
  group by n.id, n.nominee_code
  order by n.nominee_code;
$$;

revoke all on function public.get_my_nominee_vote_summary()
from public, anon;

grant execute on function public.get_my_nominee_vote_summary()
to authenticated;

create or replace function public.get_my_nominee_vote_performance(
  p_days integer default 30
)
returns table (
  vote_date date,
  net_votes bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with mine as (
    select n.id
    from public.nominees n
    where n.auth_user_id = auth.uid()
      and public.has_permission('nominee.portal')
    order by n.created_at desc
    limit 1
  )
  select
    timezone(
      'Africa/Freetown',
      vl.created_at
    )::date as vote_date,
    coalesce(sum(vl.quantity_delta), 0)::bigint
      as net_votes
  from mine m
  join public.vote_ledger vl
    on vl.nominee_id = m.id
  where vl.created_at >=
    now() - make_interval(days => greatest(1, least(p_days, 365)))
  group by
    timezone(
      'Africa/Freetown',
      vl.created_at
    )::date
  order by vote_date asc;
$$;

revoke all on function public.get_my_nominee_vote_performance(integer)
from public, anon;

grant execute on function public.get_my_nominee_vote_performance(integer)
to authenticated;

-- Private Storage bucket. File bytes are never public; nominees receive
-- short-lived signed URLs only after application-level authorization.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'nominee-resources',
  'nominee-resources',
  false,
  10485760,
  array[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;


create or replace function public.issue_nominee_ceremony_pass(
  p_nominee_id uuid,
  p_event_id uuid,
  p_ticket_id uuid,
  p_ticket_code text,
  p_qr_token_hash text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_nominee public.nominees%rowtype;
  v_event public.events%rowtype;
  v_ticket_type public.ticket_types%rowtype;
  v_order_id uuid;
  v_order_item_id uuid;
  v_pass_id uuid;
  v_existing public.nominee_ceremony_passes%rowtype;
  v_year text;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  if not public.has_permission(
    'events.manage',
    'event',
    p_event_id
  ) then
    raise exception 'Event management permission required'
      using errcode = '42501';
  end if;

  select *
    into v_nominee
  from public.nominees
  where id = p_nominee_id;

  if not found then
    raise exception 'Nominee not found';
  end if;

  if v_nominee.auth_user_id is null then
    raise exception
      'Nominee must be linked to a portal account before a ceremony pass is issued';
  end if;

  if v_nominee.status not in ('approved', 'published') then
    raise exception
      'Only approved or published nominees can receive a ceremony pass';
  end if;

  select *
    into v_event
  from public.events
  where id = p_event_id;

  if not found then
    raise exception 'Event not found';
  end if;

  if v_event.award_edition_id is distinct from
     v_nominee.award_edition_id then
    raise exception
      'Nominee and ceremony event must belong to the same award edition';
  end if;

  select *
    into v_existing
  from public.nominee_ceremony_passes
  where nominee_id = p_nominee_id
    and event_id = p_event_id
  for update;

  if found and v_existing.status = 'active' then
    raise exception 'An active ceremony pass already exists';
  end if;

  select *
    into v_ticket_type
  from public.ticket_types
  where event_id = p_event_id
    and name = 'Nominee Ceremony Pass'
  limit 1;

  if not found then
    insert into public.ticket_types (
      event_id,
      name,
      description,
      pricing_type,
      price,
      currency,
      max_per_order,
      admissions_per_unit,
      is_active,
      sort_order,
      created_by
    )
    values (
      p_event_id,
      'Nominee Ceremony Pass',
      'Internal complimentary ceremony access for an approved nominee.',
      'free',
      0,
      'SLE',
      1,
      1,
      false,
      9999,
      v_user_id
    )
    returning * into v_ticket_type;
  elsif v_ticket_type.pricing_type <> 'free' then
    raise exception
      'Existing Nominee Ceremony Pass ticket type must use free pricing';
  end if;

  v_year := to_char(
    coalesce(v_event.starts_at, now()),
    'YY'
  );

  insert into public.ticket_orders (
    order_number,
    event_id,
    purchaser_name,
    subtotal,
    total_amount,
    currency,
    status,
    is_complimentary,
    complimentary_reason,
    complimentary_by
  )
  values (
    'CMP-' || v_year || '-' ||
      upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
    p_event_id,
    v_nominee.full_name,
    0,
    0,
    'SLE',
    'paid',
    true,
    'Nominee ceremony pass',
    v_user_id
  )
  returning id into v_order_id;

  insert into public.ticket_order_items (
    ticket_order_id,
    ticket_type_id,
    ticket_type_name,
    pricing_type,
    quantity,
    admissions_per_unit,
    unit_amount
  )
  values (
    v_order_id,
    v_ticket_type.id,
    v_ticket_type.name,
    'free',
    1,
    1,
    0
  )
  returning id into v_order_item_id;

  insert into public.tickets (
    id,
    ticket_order_id,
    ticket_order_item_id,
    event_id,
    ticket_type_id,
    ticket_code,
    qr_token_hash,
    status,
    holder_name,
    admission_sequence
  )
  values (
    p_ticket_id,
    v_order_id,
    v_order_item_id,
    p_event_id,
    v_ticket_type.id,
    trim(p_ticket_code),
    trim(p_qr_token_hash),
    'active',
    v_nominee.full_name,
    1
  );

  if v_existing.id is null then
    insert into public.nominee_ceremony_passes (
      nominee_id,
      event_id,
      ticket_id,
      status,
      issued_by
    )
    values (
      p_nominee_id,
      p_event_id,
      p_ticket_id,
      'active',
      v_user_id
    )
    returning id into v_pass_id;
  else
    update public.nominee_ceremony_passes
    set
      ticket_id = p_ticket_id,
      status = 'active',
      issued_by = v_user_id,
      issued_at = now(),
      revoked_by = null,
      revoked_at = null,
      revoke_reason = null,
      updated_at = now()
    where id = v_existing.id
    returning id into v_pass_id;
  end if;

  insert into public.audit_logs (
    actor_user_id,
    action,
    entity_type,
    entity_id,
    old_data,
    new_data,
    metadata
  )
  values (
    v_user_id,
    'nominee_ceremony_pass_issued',
    'nominee_ceremony_pass',
    v_pass_id,
    null,
    jsonb_build_object(
      'nominee_id', p_nominee_id,
      'event_id', p_event_id,
      'ticket_id', p_ticket_id,
      'ticket_code', trim(p_ticket_code)
    ),
    jsonb_build_object(
      'complimentary', true
    )
  );

  return v_pass_id;
end;
$$;

revoke all on function public.issue_nominee_ceremony_pass(
  uuid, uuid, uuid, text, text
) from public, anon;

grant execute on function public.issue_nominee_ceremony_pass(
  uuid, uuid, uuid, text, text
) to authenticated;

create or replace function public.revoke_nominee_ceremony_pass(
  p_pass_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_pass public.nominee_ceremony_passes%rowtype;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  select *
    into v_pass
  from public.nominee_ceremony_passes
  where id = p_pass_id
  for update;

  if not found then
    raise exception 'Ceremony pass not found';
  end if;

  if not public.has_permission(
    'events.manage',
    'event',
    v_pass.event_id
  ) then
    raise exception 'Event management permission required'
      using errcode = '42501';
  end if;

  if v_pass.status = 'revoked' then
    return;
  end if;

  update public.ticket_orders
  set
    status = 'cancelled',
    updated_at = now()
  where id = (
    select t.ticket_order_id
    from public.tickets t
    where t.id = v_pass.ticket_id
  )
    and is_complimentary = true
    and status = 'paid';

  update public.tickets
  set
    status = 'cancelled',
    cancelled_at = now(),
    updated_at = now()
  where id = v_pass.ticket_id
    and status = 'active';

  update public.nominee_ceremony_passes
  set
    status = 'revoked',
    revoked_by = v_user_id,
    revoked_at = now(),
    revoke_reason = nullif(
      trim(coalesce(p_reason, '')),
      ''
    ),
    updated_at = now()
  where id = v_pass.id;

  insert into public.audit_logs (
    actor_user_id,
    action,
    entity_type,
    entity_id,
    old_data,
    new_data,
    metadata
  )
  values (
    v_user_id,
    'nominee_ceremony_pass_revoked',
    'nominee_ceremony_pass',
    v_pass.id,
    jsonb_build_object(
      'status', v_pass.status,
      'ticket_id', v_pass.ticket_id
    ),
    jsonb_build_object(
      'status', 'revoked',
      'reason', nullif(
        trim(coalesce(p_reason, '')),
        ''
      )
    ),
    '{}'::jsonb
  );
end;
$$;

revoke all on function public.revoke_nominee_ceremony_pass(
  uuid, text
) from public, anon;

grant execute on function public.revoke_nominee_ceremony_pass(
  uuid, text
) to authenticated;


commit;
