# Phase 10 — Nominee Portal Completion

This phase follows the agreed roadmap after Users & Roles + Audit.

It replaces the remaining nominee demo pages with live data and also completes
the minimum admin-side publishing workflow required to make Announcements,
Documents and Ceremony Pass useful.

## Repo state checked before this phase

The current `main` branch contains the Users & Roles + Audit phase and the
latest Vercel deployment is green.

The nominee dashboard was already live, but these routes were still demo
screens:

- `/nominee/profile`
- `/nominee/campaign`
- `/nominee/performance`
- `/nominee/announcements`
- `/nominee/documents`
- `/nominee/pass`

`/admin/communication` was also still a generic demo screen.

## Files

New:

- `supabase/migrations/0016_nominee_portal_completion.sql`
- `lib/nominee/actions.ts`
- `lib/nominee/admin-actions.ts`
- `lib/nominee/admin-data.ts`
- `components/portal/nominee-campaign-actions.tsx`
- `components/portal/nominee-live-pages.tsx`
- `components/portal/nominee-communication-admin.tsx`
- `app/api/nominee/campaign/qr/route.ts`
- `app/api/nominee/pass/qr/route.ts`
- `app/api/nominee/resources/[id]/route.ts`

Replace:

- `lib/nominee/live-data.ts`
- `app/admin/communication/page.tsx`
- `app/nominee/profile/page.tsx`
- `app/nominee/campaign/page.tsx`
- `app/nominee/performance/page.tsx`
- `app/nominee/announcements/page.tsx`
- `app/nominee/documents/page.tsx`
- `app/nominee/pass/page.tsx`

No new npm dependency is required. The existing `qrcode` dependency is reused.

No new environment variable is required. The ceremony-pass QR uses the existing
server-only `TICKET_QR_SECRET` introduced for normal tickets.

## 1. Run migration 0016

Run:

`supabase/migrations/0016_nominee_portal_completion.sql`

in the correct Supabase project.

It creates:

### `nominee_announcements`

Edition-scoped internal announcements with:

- Information / Important / Urgent priority
- draft/published state
- publish timestamp
- optional expiry

Only linked nominees in that edition can read published, non-expired records.

### `nominee_resources`

Private edition-scoped nominee files with:

- Document
- Campaign Asset
- Ceremony Resource

Files are stored in a PRIVATE Supabase Storage bucket named:

`nominee-resources`

Nominees never receive public Storage URLs. The download endpoint first checks
the logged-in nominee through RLS, then creates a short-lived signed URL.

### `nominee_ceremony_passes`

Maps one nominee to one real event ticket for a ceremony.

The pass is NOT a decorative QR.

It uses the existing:

- `tickets`
- ticket QR security
- scanner validation
- duplicate check-in protection

### Complimentary ticket metadata

`ticket_orders` gains:

- `is_complimentary`
- `complimentary_reason`
- `complimentary_by`

A nominee ceremony pass creates a zero-value complimentary order and NO payment
record, so Finance revenue is not inflated.

## 2. Profile

`/nominee/profile`

Live data replaces the Mariama/demo profile.

A nominee may self-edit only:

- institution
- biography

The following remain administrator-controlled:

- official name
- nominee code
- category
- profile photo
- publication status
- votes
- results

Self-service changes are audited.

## 3. Campaign Tools

`/nominee/campaign`

Provides:

- personal `/vote/{nominee_code}` URL
- Copy Link
- native Share where supported
- live QR code
- downloadable high-resolution QR PNG
- approved campaign assets published by administration

The QR route is authenticated and derives the link from the current deployed
origin.

## 4. Performance

`/nominee/performance`

Shows privacy-safe aggregate data only:

- total net votes
- current rank when leaderboard visibility permits it
- net votes today
- net votes over the last seven days
- recent aggregate trend

The nominee does NOT receive:

- voter names
- payer email/phone
- payment IDs
- vote-order details

The migration also hardens the nominee vote-summary RPC so a suspended/disabled
profile no longer retains nominee-portal metrics access.

## 5. Announcements

`/nominee/announcements`

Reads only:

- published
- non-expired
- same-edition

announcements.

## 6. Documents

`/nominee/documents`

Shows secure private resources published to the nominee's award edition.

Downloads use:

`/api/nominee/resources/{resource_id}`

which performs authorization before issuing a 60-second signed Storage URL.

Campaign assets appear under Campaign Tools instead of Documents.

## 7. Ceremony Pass

`/nominee/pass`

When no pass is issued, the nominee sees a clean pending state.

When Event Management issues a pass, the nominee receives:

- real event details
- individual ticket code
- real QR ticket
- scanner-compatible one-time admission

If revoked:

- complimentary order becomes cancelled
- ticket becomes cancelled
- nominee pass becomes revoked
- the existing scanner rejects the QR

## 8. Admin Nominee Communication

`/admin/communication`

is no longer a demo screen.

### Award / Nomination managers

For an edition they manage they can:

- create announcements
- publish/unpublish announcements
- upload secure nominee resources
- publish/unpublish resources

### Event managers

For an event they manage they can:

- issue a nominee ceremony pass
- revoke a nominee ceremony pass

A user who only manages an Event cannot publish award-wide announcements or
documents.

This preserves the existing scoped RBAC model instead of giving global access.

## 9. Pass issuance rule

A ceremony pass can be issued only when:

- the nominee is linked to a Nominee Portal account
- nominee status is Approved or Published
- event and nominee belong to the same Award Edition
- issuing user has `events.manage` for that event
- no active pass already exists for that nominee/event

The system internally creates an inactive/free ticket type named
`Nominee Ceremony Pass` when required. Because `is_active=false`, it is not
offered as a public ticket tier.

## 10. Apply sequence

1. Run `0016_nominee_portal_completion.sql`.
2. Add/replace the files from this package.
3. Commit and deploy.
4. Confirm Vercel build is green.
5. Test with a linked nominee account.
6. Run `CHECK_PHASE10_NOMINEE_PORTAL.sql`.

## 11. Acceptance test

### Profile

- log in as a linked nominee
- update institution/bio
- confirm public profile changes
- confirm code/category/name remain locked

### Campaign

- copy personal voting URL
- scan campaign QR with a phone
- confirm it opens `/vote/{nominee_code}`
- upload a Campaign Asset through Admin Communication
- confirm nominee can securely download it

### Performance

- confirm totals match the nominee ledger
- hide leaderboard in Edition management
- confirm rank disappears while personal aggregate totals remain available

### Announcements/Documents

- create as draft -> nominee must not see it
- publish -> nominee must see it
- unpublish -> it must disappear

### Ceremony pass

- issue a test pass from Admin Communication
- nominee opens `/nominee/pass`
- scan QR once -> CHECKED IN
- scan again -> ALREADY USED

For a separate unscanned test pass:

- revoke pass
- scanner must return CANCELLED / reject admission

## 12. Intentional boundaries

This phase does NOT expose supporting nomination/verification documents from
the existing `nominee_documents` table. Those may contain private application
material and remain separate from nominee-facing resources.

It also does not let nominees change their profile photo or official identity
fields. Those remain controlled admin data.

## Next roadmap item

After Phase 10 is verified:

Public CMS + removal of remaining mock/demo content.

That includes:

- Homepage live content cleanup
- Programs
- About
- News
- Gallery
- Partners
- Contact
- remaining frontend-preview labels and mock data
