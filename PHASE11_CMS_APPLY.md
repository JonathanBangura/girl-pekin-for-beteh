# Phase 11 — Public CMS + Public Demo-Content Removal

This phase follows the completed Nominee Portal work and the sidebar hotfix.

## Repo check before this phase

The current `main` branch includes:

- Phase 10 nominee portal work
- the desktop sticky-sidebar hotfix

The public website still had placeholder/demo content in:

- Home
- About
- Programs
- News
- Gallery
- Partners
- Contact

The public shared component also still imported `lib/mock-data`, and the public
footer still displayed `Frontend preview · Live data integration pending`.

The existing backend already contains a real `programs` table, so this phase
uses it instead of creating a second programme model.

## Important content rule

This phase does NOT invent:

- mission
- vision
- history
- leadership
- impact figures
- programme names
- partner names
- contact details
- sponsors

If approved information has not been entered, the public site shows a neutral
empty state rather than fake content.

## Files

### New

- `supabase/migrations/0017_public_cms.sql`
- `lib/public/cms-data.ts`
- `lib/public/contact-actions.ts`
- `lib/cms/data.ts`
- `lib/cms/actions.ts`
- `components/public/cms-pages.tsx`
- `components/portal/cms-management.tsx`
- `app/programs/[slug]/page.tsx`
- `app/news/[slug]/page.tsx`

### Replace

- `components/public/public.tsx`
- `app/page.tsx`
- `app/about/page.tsx`
- `app/programs/page.tsx`
- `app/news/page.tsx`
- `app/gallery/page.tsx`
- `app/partners/page.tsx`
- `app/contact/page.tsx`
- `app/admin/programs/page.tsx`
- `app/admin/content/page.tsx`

### CSS

Append the contents of:

`PHASE11_CMS_STYLES.css`

to the END of `app/globals.css`.

The CSS also hides the obsolete portal `Frontend Preview` badge. A later source
cleanup can remove the dead label from the portal component itself.

## 1. Run migration 0017

Run:

`supabase/migrations/0017_public_cms.sql`

in the correct Supabase project.

It creates:

- `site_pages`
- `news_posts`
- `gallery_items`
- `partners`
- `site_settings`
- `contact_submissions`
- public Storage bucket `public-site-media`

No new environment variable is required.

No new npm package is required.

## 2. Admin Programs

`/admin/programs`

is no longer a demo table.

Users with either:

- `programs.manage`
- `content.manage`

can create/edit:

- title
- slug
- summary
- body
- cover image
- publication state
- sort order

Only `published` records are public.

## 3. Admin Public Content

`/admin/content`

becomes the public CMS.

It manages:

### Core page copy

- Homepage
- About
- Contact

Each page can remain Draft or be Published.

### Contact / social settings

- official email
- official phone
- official address
- Instagram
- Facebook
- X

Blank details remain absent from the public page.

### News

- title
- slug
- excerpt
- body
- cover image
- draft/published/archive
- sort order

### Gallery

- title
- caption
- image
- draft/published/archive
- sort order

### Partners

- name
- partner type
- description
- logo
- website
- draft/published/archive
- sort order

### Contact enquiries

Public contact-form submissions are stored privately and can be marked:

- New
- Read
- Replied
- Closed

They are not publicly readable.

## 4. Public Homepage

The homepage now combines real published data:

- CMS homepage copy
- published programs
- current public award edition
- published nominees from the current award
- published news
- published partners

No representative nominee or event demo arrays are used.

## 5. Programs

Public:

- `/programs`
- `/programs/{slug}`

Both read directly from the real `programs` table under existing public RLS.

## 6. About

`/about`

reads only the published `about` CMS record.

If approved organizational copy has not been published, the page does not
invent mission, vision, history or leadership.

## 7. News

Public:

- `/news`
- `/news/{slug}`

Only published news records are visible.

## 8. Gallery

`/gallery`

shows only published images from the CMS.

The previous colored placeholder tiles are removed from the live route.

## 9. Partners

`/partners`

shows only published partner records.

The previous `Title Partner`, `Supporting Partner`, and `Media Partner`
placeholder records are removed from the live route.

## 10. Contact

`/contact`

now has:

- real published CMS copy
- real configured contact details
- functional enquiry form
- private submission storage

The form includes a honeypot field and server-side length/email validation.
It does not expose a public insert permission on the database table; the
server-side action performs the insert through the existing server-only admin
client.

## 11. Public media

Admin image uploads use:

`public-site-media`

Allowed:

- PNG
- JPEG
- WebP

Maximum:

5 MB

The bucket is public because the media is intentionally published website
content. Private nominee resources remain in their separate private bucket.

## 12. Mock-data cleanup

After these route replacements, `components/public/content-pages.tsx` is no
longer needed by the replaced public routes and can be deleted after a green
build.

Do NOT delete `lib/mock-data.ts` yet.

The legacy `components/portal/portal.tsx` still imports old demo chart data even
though the current Admin and Nominee dashboard routes use their live dashboard
components. Remove that dead dependency only during the final admin-demo source
cleanup so we do not cause an unrelated compile regression.

## 13. Apply order

1. Run `0017_public_cms.sql`.
2. Add the new `lib/public` and `lib/cms` files.
3. Add the new public/admin components.
4. Replace the listed page files.
5. Replace `components/public/public.tsx`.
6. Append `PHASE11_CMS_STYLES.css` to `app/globals.css`.
7. Commit and deploy.
8. Confirm the Vercel build is green.
9. Open `/admin/content` and `/admin/programs`.
10. Enter only approved real content.
11. Run `CHECK_PHASE11_PUBLIC_CMS.sql`.
12. Test all public routes on mobile and desktop.

## 14. Acceptance test

### Draft protection

Create a News post as Draft.

Expected:

- visible in Admin Content
- NOT visible on `/news`

Publish it.

Expected:

- visible on `/news`
- `/news/{slug}` loads

### Programs

Create/publish one real programme.

Expected:

- appears on `/programs`
- appears on homepage
- detail route works

### Gallery

Upload one image as Draft.

Expected: not public.

Publish it.

Expected: appears on `/gallery`.

### Contact

Submit the public form.

Expected:

- success state on `/contact`
- submission appears in `/admin/content`
- it can be marked Read/Replied/Closed

### Empty official content

Leave an unconfirmed field blank.

Expected:

- blank/unpublished information stays absent
- no placeholder or invented fact appears

## 15. Remaining demo/admin audit discovered during this check

Two admin routes are still genuine demo shells and should NOT be forgotten:

- `/admin/awards/applications`
- `/admin/settings`

This CMS phase does not silently repurpose those workflows.

After Phase 11 is verified, the next focused cleanup should be:

Phase 12 — Applications + Platform Settings + dead demo-source removal

That is the correct place to remove the remaining generic `AdminPage` demo
configuration and the old mock-data imports safely.
