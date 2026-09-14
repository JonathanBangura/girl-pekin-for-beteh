-- 0017_public_cms.sql
-- Public website CMS for approved organizational content.
-- Does not seed invented mission, leadership, programme, partner or contact data.

begin;

create table if not exists public.site_pages (
  id uuid primary key default gen_random_uuid(),
  page_key text not null unique
    check (page_key in ('home', 'about', 'contact')),
  eyebrow text,
  title text,
  summary text,
  body text,
  secondary_body text,
  cta_label text,
  cta_href text,
  is_published boolean not null default false,
  published_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.news_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text,
  body text,
  cover_image_url text,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  published_at timestamptz,
  sort_order integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gallery_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  caption text,
  image_url text not null,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  published_at timestamptz,
  sort_order integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  partner_type text,
  description text,
  logo_url text,
  website_url text,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  sort_order integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  singleton boolean primary key default true check (singleton = true),
  contact_email text,
  contact_phone text,
  contact_address text,
  instagram_url text,
  facebook_url text,
  x_url text,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.contact_submissions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  subject text,
  message text not null,
  status text not null default 'new'
    check (status in ('new', 'read', 'replied', 'closed')),
  handled_by uuid references public.profiles(id) on delete set null,
  handled_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists news_posts_public_idx
  on public.news_posts(status, published_at desc, sort_order);

create index if not exists gallery_items_public_idx
  on public.gallery_items(status, sort_order, published_at desc);

create index if not exists partners_public_idx
  on public.partners(status, sort_order, name);

create index if not exists contact_submissions_status_idx
  on public.contact_submissions(status, created_at desc);

do $$
declare
  t text;
begin
  foreach t in array array[
    'site_pages',
    'news_posts',
    'gallery_items',
    'partners'
  ]
  loop
    execute format(
      'drop trigger if exists %I_set_updated_at on public.%I',
      t,
      t
    );
    execute format(
      'create trigger %I_set_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      t,
      t
    );
  end loop;
end $$;

alter table public.site_pages enable row level security;
alter table public.news_posts enable row level security;
alter table public.gallery_items enable row level security;
alter table public.partners enable row level security;
alter table public.site_settings enable row level security;
alter table public.contact_submissions enable row level security;

drop policy if exists site_pages_public_read on public.site_pages;
create policy site_pages_public_read
on public.site_pages for select
to anon, authenticated
using (is_published = true);

drop policy if exists news_posts_public_read on public.news_posts;
create policy news_posts_public_read
on public.news_posts for select
to anon, authenticated
using (status = 'published');

drop policy if exists gallery_items_public_read on public.gallery_items;
create policy gallery_items_public_read
on public.gallery_items for select
to anon, authenticated
using (status = 'published');

drop policy if exists partners_public_read on public.partners;
create policy partners_public_read
on public.partners for select
to anon, authenticated
using (status = 'published');

drop policy if exists site_settings_public_read on public.site_settings;
create policy site_settings_public_read
on public.site_settings for select
to anon, authenticated
using (true);

drop policy if exists site_pages_staff_read on public.site_pages;
create policy site_pages_staff_read
on public.site_pages for select
to authenticated
using (
  public.has_permission('content.manage')
  or public.has_permission('audit.read')
);

drop policy if exists news_posts_staff_read on public.news_posts;
create policy news_posts_staff_read
on public.news_posts for select
to authenticated
using (
  public.has_permission('content.manage')
  or public.has_permission('audit.read')
);

drop policy if exists gallery_items_staff_read on public.gallery_items;
create policy gallery_items_staff_read
on public.gallery_items for select
to authenticated
using (
  public.has_permission('content.manage')
  or public.has_permission('audit.read')
);

drop policy if exists partners_staff_read on public.partners;
create policy partners_staff_read
on public.partners for select
to authenticated
using (
  public.has_permission('content.manage')
  or public.has_permission('audit.read')
);

drop policy if exists site_settings_staff_read on public.site_settings;
create policy site_settings_staff_read
on public.site_settings for select
to authenticated
using (
  public.has_permission('content.manage')
  or public.has_permission('audit.read')
);

drop policy if exists contact_submissions_staff_read
  on public.contact_submissions;
create policy contact_submissions_staff_read
on public.contact_submissions for select
to authenticated
using (public.has_permission('content.manage'));

grant select on table public.site_pages to anon, authenticated;
grant select on table public.news_posts to anon, authenticated;
grant select on table public.gallery_items to anon, authenticated;
grant select on table public.partners to anon, authenticated;
grant select on table public.site_settings to anon, authenticated;
grant select on table public.contact_submissions to authenticated;

revoke insert, update, delete
on table public.site_pages
from anon, authenticated;

revoke insert, update, delete
on table public.news_posts
from anon, authenticated;

revoke insert, update, delete
on table public.gallery_items
from anon, authenticated;

revoke insert, update, delete
on table public.partners
from anon, authenticated;

revoke insert, update, delete
on table public.site_settings
from anon, authenticated;

revoke insert, update, delete
on table public.contact_submissions
from anon, authenticated;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'public-site-media',
  'public-site-media',
  true,
  5242880,
  array[
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
