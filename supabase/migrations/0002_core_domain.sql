-- 0002_core_domain.sql
-- Public programmes, awards, editions, categories, nominees, events and ticket types.

begin;

create table if not exists public.programs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  summary text,
  body text,
  cover_image_url text,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  published_at timestamptz,
  sort_order integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.awards (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  summary text,
  description text,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  branding jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.award_editions (
  id uuid primary key default gen_random_uuid(),
  award_id uuid not null references public.awards(id) on delete cascade,
  year integer not null check (year between 2000 and 2200),
  edition_number integer,
  edition_label text not null,
  theme text,
  description text,
  status text not null default 'draft'
    check (status in (
      'draft',
      'published',
      'nominations_open',
      'review',
      'voting_open',
      'voting_closed',
      'results_review',
      'results_published',
      'archived'
    )),
  is_public boolean not null default false,
  voting_starts_at timestamptz,
  voting_ends_at timestamptz,
  leaderboard_visibility text not null default 'hidden'
    check (leaderboard_visibility in ('hidden', 'visible', 'frozen')),
  leaderboard_frozen_at timestamptz,
  results_published_at timestamptz,
  branding jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (award_id, year),
  check (
    voting_starts_at is null
    or voting_ends_at is null
    or voting_ends_at > voting_starts_at
  )
);

create table if not exists public.award_categories (
  id uuid primary key default gen_random_uuid(),
  award_edition_id uuid not null references public.award_editions(id) on delete cascade,
  slug text not null,
  name text not null,
  description text,
  is_public boolean not null default true,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (award_edition_id, slug),
  unique (id, award_edition_id)
);

create table if not exists public.nominees (
  id uuid primary key default gen_random_uuid(),
  award_edition_id uuid not null references public.award_editions(id) on delete cascade,
  category_id uuid not null,
  auth_user_id uuid references public.profiles(id) on delete set null,
  nominee_code text not null,
  full_name text not null,
  institution text,
  bio text,
  photo_url text,
  status text not null default 'draft'
    check (status in (
      'draft',
      'submitted',
      'under_review',
      'approved',
      'published',
      'suspended',
      'disqualified',
      'withdrawn',
      'archived'
    )),
  is_public boolean not null default false,
  sort_order integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (award_edition_id, nominee_code),
  constraint nominees_category_same_edition_fk
    foreign key (category_id, award_edition_id)
    references public.award_categories(id, award_edition_id)
    on delete restrict
);

create index if not exists nominees_edition_idx on public.nominees(award_edition_id);
create index if not exists nominees_category_idx on public.nominees(category_id);
create index if not exists nominees_auth_user_idx on public.nominees(auth_user_id);
create index if not exists nominees_status_idx on public.nominees(status, is_public);

create table if not exists public.nominee_documents (
  id uuid primary key default gen_random_uuid(),
  nominee_id uuid not null references public.nominees(id) on delete cascade,
  document_type text not null,
  storage_path text not null,
  original_filename text,
  mime_type text,
  file_size_bytes bigint check (file_size_bytes is null or file_size_bytes >= 0),
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists nominee_documents_nominee_idx
  on public.nominee_documents(nominee_id);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  award_edition_id uuid references public.award_editions(id) on delete set null,
  slug text not null unique,
  title text not null,
  summary text,
  description text,
  venue text,
  starts_at timestamptz,
  ends_at timestamptz,
  access_type text not null default 'open'
    check (access_type in ('free_registration', 'paid', 'invitation_only', 'open')),
  status text not null default 'draft'
    check (status in ('draft', 'published', 'sales_closed', 'completed', 'cancelled', 'archived')),
  is_public boolean not null default false,
  capacity integer check (capacity is null or capacity >= 0),
  cover_image_url text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (starts_at is null or ends_at is null or ends_at > starts_at)
);

create index if not exists events_edition_idx on public.events(award_edition_id);
create index if not exists events_public_idx on public.events(status, is_public);

create table if not exists public.ticket_types (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  description text,
  pricing_type text not null
    check (pricing_type in ('fixed', 'donation', 'free')),
  price numeric(14,2),
  min_donation numeric(14,2),
  currency text not null default 'SLE',
  capacity integer check (capacity is null or capacity >= 0),
  sales_starts_at timestamptz,
  sales_ends_at timestamptz,
  max_per_order integer check (max_per_order is null or max_per_order > 0),
  admissions_per_unit integer not null default 1 check (admissions_per_unit > 0),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, name),
  check (
    (pricing_type = 'fixed' and price is not null and price >= 0)
    or
    (pricing_type = 'donation' and price is null and coalesce(min_donation, 0) >= 0)
    or
    (pricing_type = 'free' and coalesce(price, 0) = 0)
  ),
  check (
    sales_starts_at is null
    or sales_ends_at is null
    or sales_ends_at > sales_starts_at
  )
);

create index if not exists ticket_types_event_idx on public.ticket_types(event_id);

-- Timestamp triggers.
do $$
declare
  t text;
begin
  foreach t in array array[
    'programs',
    'awards',
    'award_editions',
    'award_categories',
    'nominees',
    'events',
    'ticket_types'
  ]
  loop
    execute format('drop trigger if exists %I_set_updated_at on public.%I', t, t);
    execute format(
      'create trigger %I_set_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      t,
      t
    );
  end loop;
end $$;

-- RLS.
alter table public.programs enable row level security;
alter table public.awards enable row level security;
alter table public.award_editions enable row level security;
alter table public.award_categories enable row level security;
alter table public.nominees enable row level security;
alter table public.nominee_documents enable row level security;
alter table public.events enable row level security;
alter table public.ticket_types enable row level security;

-- Public website reads.
drop policy if exists programs_public_read on public.programs;
create policy programs_public_read
on public.programs for select
to anon, authenticated
using (status = 'published');

drop policy if exists awards_public_read on public.awards;
create policy awards_public_read
on public.awards for select
to anon, authenticated
using (status = 'published');

drop policy if exists editions_public_read on public.award_editions;
create policy editions_public_read
on public.award_editions for select
to anon, authenticated
using (is_public = true and status <> 'archived' and status <> 'draft');

drop policy if exists categories_public_read on public.award_categories;
create policy categories_public_read
on public.award_categories for select
to anon, authenticated
using (
  is_public = true
  and is_active = true
  and exists (
    select 1
    from public.award_editions e
    where e.id = award_categories.award_edition_id
      and e.is_public = true
      and e.status <> 'draft'
      and e.status <> 'archived'
  )
);

drop policy if exists nominees_public_read on public.nominees;
create policy nominees_public_read
on public.nominees for select
to anon, authenticated
using (
  is_public = true
  and status = 'published'
  and exists (
    select 1
    from public.award_editions e
    where e.id = nominees.award_edition_id
      and e.is_public = true
      and e.status <> 'draft'
      and e.status <> 'archived'
  )
);

drop policy if exists nominees_own_read on public.nominees;
create policy nominees_own_read
on public.nominees for select
to authenticated
using (auth_user_id = auth.uid());

drop policy if exists nominee_documents_own_read on public.nominee_documents;
create policy nominee_documents_own_read
on public.nominee_documents for select
to authenticated
using (
  exists (
    select 1
    from public.nominees n
    where n.id = nominee_documents.nominee_id
      and n.auth_user_id = auth.uid()
  )
);

drop policy if exists events_public_read on public.events;
create policy events_public_read
on public.events for select
to anon, authenticated
using (is_public = true and status in ('published', 'sales_closed', 'completed'));

drop policy if exists ticket_types_public_read on public.ticket_types;
create policy ticket_types_public_read
on public.ticket_types for select
to anon, authenticated
using (
  is_active = true
  and exists (
    select 1
    from public.events e
    where e.id = ticket_types.event_id
      and e.is_public = true
      and e.status in ('published', 'sales_closed')
  )
);

-- Authorized staff reads.
drop policy if exists programs_staff_read on public.programs;
create policy programs_staff_read
on public.programs for select
to authenticated
using (public.has_permission('programs.manage') or public.has_permission('content.manage') or public.has_permission('audit.read'));

drop policy if exists awards_staff_read on public.awards;
create policy awards_staff_read
on public.awards for select
to authenticated
using (
  public.has_permission('awards.manage')
  or public.has_permission('nominations.review')
  or public.has_permission('voting.manage')
  or public.has_permission('results.manage')
  or public.has_permission('audit.read')
);

drop policy if exists editions_staff_read on public.award_editions;
create policy editions_staff_read
on public.award_editions for select
to authenticated
using (
  public.has_permission('awards.manage', 'award_edition', id)
  or public.has_permission('nominations.review', 'award_edition', id)
  or public.has_permission('voting.manage', 'award_edition', id)
  or public.has_permission('results.manage', 'award_edition', id)
  or public.has_permission('audit.read')
);

drop policy if exists categories_staff_read on public.award_categories;
create policy categories_staff_read
on public.award_categories for select
to authenticated
using (
  public.has_permission('awards.manage', 'award_edition', award_edition_id)
  or public.has_permission('nominations.review', 'award_edition', award_edition_id)
  or public.has_permission('voting.manage', 'award_edition', award_edition_id)
  or public.has_permission('results.manage', 'award_edition', award_edition_id)
  or public.has_permission('audit.read')
);

drop policy if exists nominees_staff_read on public.nominees;
create policy nominees_staff_read
on public.nominees for select
to authenticated
using (
  public.has_permission('awards.manage', 'award_edition', award_edition_id)
  or public.has_permission('nominations.review', 'award_edition', award_edition_id)
  or public.has_permission('voting.manage', 'award_edition', award_edition_id)
  or public.has_permission('results.manage', 'award_edition', award_edition_id)
  or public.has_permission('audit.read')
);

drop policy if exists nominee_documents_staff_read on public.nominee_documents;
create policy nominee_documents_staff_read
on public.nominee_documents for select
to authenticated
using (
  exists (
    select 1
    from public.nominees n
    where n.id = nominee_documents.nominee_id
      and (
        public.has_permission('awards.manage', 'award_edition', n.award_edition_id)
        or public.has_permission('nominations.review', 'award_edition', n.award_edition_id)
        or public.has_permission('audit.read')
      )
  )
);

drop policy if exists events_staff_read on public.events;
create policy events_staff_read
on public.events for select
to authenticated
using (
  public.has_permission('events.manage', 'event', id)
  or public.has_permission('checkin.use', 'event', id)
  or public.has_permission('finance.manage')
  or public.has_permission('audit.read')
);

drop policy if exists ticket_types_staff_read on public.ticket_types;
create policy ticket_types_staff_read
on public.ticket_types for select
to authenticated
using (
  public.has_permission('events.manage', 'event', event_id)
  or public.has_permission('checkin.use', 'event', event_id)
  or public.has_permission('finance.manage')
  or public.has_permission('audit.read')
);

-- Direct browser writes are intentionally not enabled for operational tables.
-- Admin mutations will be performed through controlled server-side actions/RPCs.
grant select on table public.programs to anon, authenticated;
grant select on table public.awards to anon, authenticated;
grant select on table public.award_editions to anon, authenticated;
grant select on table public.award_categories to anon, authenticated;
grant select on table public.nominees to anon, authenticated;
grant select on table public.events to anon, authenticated;
grant select on table public.ticket_types to anon, authenticated;

grant select on table public.nominee_documents to authenticated;

commit;
