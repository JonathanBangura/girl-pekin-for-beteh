# Phase 12 — Applications + Platform Settings + Active Demo Cleanup

This phase follows the Public CMS work.

## Repo check before this phase

The current `main` branch is the `CMS` commit.

Two admin routes were still genuine demo shells:

- `/admin/awards/applications`
- `/admin/settings`

The current live Admin dashboard already counts nominees in `submitted` and
`under_review` as the review queue, so the Applications page should use the
existing nominee lifecycle instead of creating a second, competing application
database.

The agreed nomination lifecycle includes a rejected outcome, but the original
`nominees.status` constraint did not contain `rejected`.

The active portal shell also still imported old `lib/mock-data` only because a
dead `PortalDashboard` demo component remained in `components/portal/portal.tsx`.

## Files

### New

- `supabase/migrations/0018_nomination_review.sql`
- `lib/applications/data.ts`
- `lib/applications/actions.ts`
- `lib/settings/data.ts`
- `components/portal/applications-management.tsx`
- `components/portal/platform-settings.tsx`
- `APPLY_PHASE12_PATCHES.py`

### Replace

- `app/admin/awards/applications/page.tsx`
- `app/admin/settings/page.tsx`
- `components/portal/portal.tsx`

No new npm package is required.

No new environment variable is required.

## 1. Run migration 0018

Run:

`supabase/migrations/0018_nomination_review.sql`

It:

- adds `rejected` to the nominee lifecycle
- adds submission/review timestamps
- adds latest review note/reviewer fields
- creates immutable `nominee_application_reviews`
- adds lifecycle timestamp automation
- restricts review-history reads to authorized staff/auditors

## 2. Apply the existing-file compatibility patches

After copying the package files into the repo, run from the repository root:

```bash
python APPLY_PHASE12_PATCHES.py
```

The patch is deliberately small and stops if the expected current code is not
found.

It does three things:

1. Adds `rejected` to the existing `nomineeStatuses` set in
   `lib/admin/actions.ts`.
2. Adds `Rejected` to the existing Nominees edit dropdown.
3. Sends the live Admin dashboard review queue to `/admin/awards/applications`.

Do not skip this patch: without it, a rejected record would not be represented
correctly in the general Nominees editor.

## 3. Applications workflow

`/admin/awards/applications`

becomes the real nomination-review queue.

It uses the existing nominee record as the application record.

Supported review path:

```text
Submitted
   ↓
Under Review
   ├── Approved
   ├── Rejected
   └── Withdrawn

Rejected
   ↓
Reopen
   ↓
Under Review
```

### Important boundary

Approved does NOT mean Published.

After approval, the record continues in:

`/admin/awards/nominees`

where publication, public visibility and Nominee Portal linking remain separate
operations.

This preserves the original agreed workflow instead of automatically exposing
approved applicants.

### Rejection reason

A rejection requires a review note.

Every transition creates:

- a `nominee_application_reviews` history row
- an `audit_logs` record

## 4. Permissions

The Applications workspace is available for an Award Edition when the current
user has either:

- `nominations.review`
- `awards.manage`

for that edition.

This respects scoped RBAC.

## 5. Platform Settings

`/admin/settings`

is no longer a fake settings table.

It requires:

`settings.manage`

and shows two kinds of real configuration.

### Operational defaults

- Girl Pikin For Betteh Foundation
- Africa/Freetown
- SLE

These match the operating assumptions already built into the product.

They are intentionally not presented as editable fields yet because allowing a
user to change them while voting/ticketing code still assumes Sierra Leone/SLE
would create misleading configuration.

### Integration readiness

The page safely checks whether the deployment contains the required
configuration for:

- Supabase public client
- Supabase server admin
- Vult payment gateway
- Vult webhook authentication
- Resend
- Ticket QR security
- application URL

Secret values are never returned to the browser.

Vult merchant ID is masked.

Private keys, passwords, API keys and QR secrets stay in deployment environment
variables.

## 6. Portal cleanup

The replacement `components/portal/portal.tsx` keeps only the active portal
shell:

- sidebar
- header
- routing labels
- mobile drawer
- account block

It removes:

- `lib/mock-data` import
- obsolete demo `PortalDashboard`
- visible `Frontend Preview` badge

The live Admin and Nominee dashboards already use their dedicated live
components, so the old demo dashboard inside `portal.tsx` is not part of the
active routes.

## 7. Dead files: do not delete until the build is green

After Phase 12 builds successfully, these old files are expected to be
unreferenced:

- `components/portal/admin-pages.tsx`
- `components/portal/admin-module.tsx`
- `components/public/content-pages.tsx`
- `lib/mock-data.ts`

Because GitHub code-search indexing for this repository is incomplete, this
package intentionally does NOT delete them automatically.

After the green Vercel build, search the repo locally/inside GitHub for their
imports. If there are zero imports, delete all four in a separate cleanup
commit.

This is safer than deleting potentially referenced files blindly.

## 8. Apply order

1. Run `0018_nomination_review.sql`.
2. Add the new `lib/applications` and `lib/settings` files.
3. Add the two new portal components.
4. Replace Applications, Settings and `components/portal/portal.tsx`.
5. Run `python APPLY_PHASE12_PATCHES.py`.
6. Commit/deploy.
7. Confirm Vercel build is green.
8. Test Applications with a test nominee.
9. Test Settings.
10. Run `CHECK_PHASE12_APPLICATIONS_SETTINGS.sql`.
11. Only after the green build, remove the four dead demo files if import
    search confirms zero references.

## 9. Acceptance test

### Applications

Create or use a test nominee with status `submitted`.

Expected:

- appears in Applications
- Start Review -> `under_review`
- Reject without a note -> blocked
- Reject with note -> `rejected`
- Reopen -> `under_review`
- Approve -> `approved`
- approved record remains non-public
- publication still happens from Nominees

### Settings

As a user with `settings.manage`:

- page loads
- integration readiness shows configured/missing state
- no secret key/private key/password is displayed

As a user without `settings.manage`:

- page is inaccessible

## 10. Next system-wide step

After Phase 12 is green, the major agreed functional blocks are implemented.

The next step should be a **system-wide QA / production-readiness audit**, not
another random feature phase.

That audit should walk:

- Auth / RBAC
- Awards / Editions / Categories
- Applications / Nominees
- Voting / payments / refunds
- Results certification
- Events / ticketing / scanner
- Finance
- Nominee Portal
- CMS / public site
- mobile UX
- remaining demo/dead code
- production environment readiness
