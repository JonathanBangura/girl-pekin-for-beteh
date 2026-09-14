-- Phase 11 Public CMS read-only verification.

-- 1. CMS tables exist.
select
  to_regclass('public.site_pages') as site_pages,
  to_regclass('public.news_posts') as news_posts,
  to_regclass('public.gallery_items') as gallery_items,
  to_regclass('public.partners') as partners,
  to_regclass('public.site_settings') as site_settings,
  to_regclass('public.contact_submissions') as contact_submissions;

-- 2. Public media bucket is available and public.
select
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
from storage.buckets
where id = 'public-site-media';

-- Expected: public = true

-- 3. Core page publication state.
select
  page_key,
  is_published,
  published_at,
  updated_at
from public.site_pages
order by page_key;

-- 4. Public content counts.
select
  (select count(*) from public.programs
   where status = 'published') as published_programs,
  (select count(*) from public.news_posts
   where status = 'published') as published_news,
  (select count(*) from public.gallery_items
   where status = 'published') as published_gallery_items,
  (select count(*) from public.partners
   where status = 'published') as published_partners;

-- 5. Contact submission queue.
select
  status,
  count(*) as submission_count
from public.contact_submissions
group by status
order by status;

-- 6. Published news must have unique, non-empty slugs.
select
  slug,
  count(*) as duplicate_count
from public.news_posts
where status = 'published'
group by slug
having count(*) > 1 or trim(slug) = '';

-- Expected: no rows

-- 7. Published programs must have unique, non-empty slugs.
select
  slug,
  count(*) as duplicate_count
from public.programs
where status = 'published'
group by slug
having count(*) > 1 or trim(slug) = '';

-- Expected: no rows

-- 8. Published gallery items must have an image.
select
  id,
  title
from public.gallery_items
where status = 'published'
  and nullif(trim(image_url), '') is null;

-- Expected: no rows

-- 9. Recent CMS audit activity.
select
  action,
  entity_type,
  entity_id,
  actor_user_id,
  created_at
from public.audit_logs
where action in (
  'site_page_saved',
  'site_settings_saved',
  'news_post_created',
  'news_post_updated',
  'gallery_item_created',
  'gallery_item_updated',
  'partner_created',
  'partner_updated',
  'contact_submission_status_changed',
  'program_created',
  'program_updated'
)
order by created_at desc
limit 50;
