-- Girl Pikin For Betteh
-- Phase 16 Public Nomination / Application Intake
-- V1 live-safe additive migration.
--
-- Public submissions continue to use public.nominees as the application record.
-- This table stores only the extra private intake details that do not belong
-- on the public nominee profile.
--
-- Run this file FIRST in the LIVE Supabase SQL Editor, then save the same
-- file in GitHub as:
-- supabase/migrations/0027_public_nomination_intake.sql

begin;

create table if not exists public.nominee_application_details (
  nominee_id uuid primary key
    references public.nominees(id) on delete cascade,

  application_type text not null
    check (application_type in ('self', 'nomination')),

  nominee_email text,
  nominee_phone text,

  nominator_name text,
  nominator_relationship text,
  nominator_email text,
  nominator_phone text,

  reference_name text,
  reference_contact text,

  declaration_accepted boolean not null default false
    check (declaration_accepted = true),

  photo_storage_path text,
  photo_original_filename text,
  photo_mime_type text,
  photo_file_size_bytes bigint
    check (
      photo_file_size_bytes is null
      or photo_file_size_bytes >= 0
    ),

  supporting_storage_path text,
  supporting_original_filename text,
  supporting_mime_type text,
  supporting_file_size_bytes bigint
    check (
      supporting_file_size_bytes is null
      or supporting_file_size_bytes >= 0
    ),

  submission_source text not null default 'public_web',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (
    application_type <> 'self'
    or nominee_email is not null
    or nominee_phone is not null
  ),

  check (
    application_type <> 'nomination'
    or (
      nominator_name is not null
      and (
        nominator_email is not null
        or nominator_phone is not null
      )
    )
  )
);

create index if not exists nominee_application_details_type_idx
  on public.nominee_application_details(
    application_type,
    created_at desc
  );

drop trigger if exists nominee_application_details_set_updated_at
  on public.nominee_application_details;

create trigger nominee_application_details_set_updated_at
before update on public.nominee_application_details
for each row
execute function public.set_updated_at();

alter table public.nominee_application_details
  enable row level security;

drop policy if exists nominee_application_details_staff_read
  on public.nominee_application_details;

create policy nominee_application_details_staff_read
on public.nominee_application_details for select
to authenticated
using (
  exists (
    select 1
    from public.nominees n
    where n.id = nominee_application_details.nominee_id
      and (
        public.has_permission(
          'nominations.review',
          'award_edition',
          n.award_edition_id
        )
        or public.has_permission(
          'awards.manage',
          'award_edition',
          n.award_edition_id
        )
        or public.has_permission('audit.read')
      )
  )
);

grant select
on public.nominee_application_details
to authenticated;

revoke insert, update, delete
on public.nominee_application_details
from anon, authenticated;

-- Public application files stay private. They are accessed by staff only
-- through short-lived signed URLs generated server-side.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'nomination-applications',
  'nomination-applications',
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

commit;
