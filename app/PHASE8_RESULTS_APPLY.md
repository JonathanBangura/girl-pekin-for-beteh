# Phase 8 — Results Certification

This phase implements the agreed results workflow:

Voting Closed
-> Freeze
-> Reconcile
-> Review
-> Approve
-> Publish

The system NEVER automatically chooses a winner.

Vote totals and category rank are snapshot evidence only. A user with
`results.manage` must explicitly select the winner for each eligible public
category during Results Review.

## Repo state checked before this phase

The current `main` branch contains the Phase 7B refund/report work and its
deployment is green.

The existing Results page is still a demo shell, while the award-edition schema
already contains:

- `voting_closed`
- `results_review`
- `results_published`
- `leaderboard_visibility`
- `leaderboard_frozen_at`
- `results_published_at`

The existing RBAC model already includes `results.manage`, assigned to the
Awards Manager and Super Admin.

## Files

New:

- `supabase/migrations/0014_results_certification.sql`
- `lib/results/admin-data.ts`
- `lib/results/actions.ts`
- `lib/results/public-data.ts`
- `components/portal/results-certification.tsx`
- `components/public/live-results.tsx`
- `app/results/page.tsx`
- `app/awards/[slug]/results/page.tsx`

Replace:

- `app/admin/awards/results/page.tsx`

No npm package, CSS or environment-variable change is required.

## 1. Run migration

Run:

`supabase/migrations/0014_results_certification.sql`

in the correct Supabase project.

## 2. What the migration adds

### `result_certifications`

One certification record per award edition.

It stores:

- workflow state
- frozen time
- reconciliation snapshot time
- review time
- approval time
- publication time
- responsible users
- immutable award/edition display snapshots

### `result_entries`

One snapshot row per nominee.

It stores:

- category
- nominee identity snapshots
- nominee eligibility at reconciliation
- reconciled vote total
- rank within category
- manual result decision
- decision note
- deciding user/time

A partial unique index prevents more than one `winner` per category.

## 3. Reconciliation checks

Before a result snapshot can be created, the system blocks on:

- completed Vult vote webhook not processed cleanly
- succeeded vote payment without paid order / positive vote-ledger entry
- refunded/reversed vote payment without negative vote-ledger entry
- paid vote order outside the configured voting window
- negative nominee vote totals

Stale pending/processing attempts older than 30 minutes are shown as warnings
but are not counted as votes.

Critical issues should be resolved under:

`/admin/finance/reconciliation`

before proceeding.

## 4. Freeze

Go to:

`/admin/awards/results`

The edition must already be `Voting Closed`.

`Freeze Results`:

- freezes the public leaderboard
- records the freeze timestamp
- starts the certification record
- does not select a winner

## 5. Reconcile

`Run Reconciliation & Create Snapshot`:

- re-runs integrity checks
- blocks if critical issues remain
- sums the append-only vote ledger
- creates a per-category vote snapshot
- computes informational dense rank
- resets any old winner decisions if reconciliation is re-run

Ties share the same vote rank.

## 6. Review

`Start Results Review` changes the edition into `results_review`.

During Review:

- every eligible nominee appears with certified vote total and rank
- the vote leader is NOT automatically selected
- a Results Manager explicitly clicks `Select Winner`
- one winner maximum is allowed per category
- optional decision notes can be recorded

If reconciliation is re-run, current winner selections are intentionally
cleared because the evidence snapshot changed.

## 7. Approve

Approval is blocked unless:

- there are no critical reconciliation issues
- the vote ledger has not changed since the snapshot
- there is at least one eligible public category
- every eligible public category has exactly one explicitly selected winner

The approval action is audited.

## 8. Publish

Publication is blocked if the snapshot became stale or a new critical integrity
issue appeared.

Publication:

- changes certification to `published`
- changes edition to `results_published`
- records publication timestamps
- keeps the leaderboard frozen
- exposes certified winners through public RLS
- creates an audit event

## 9. Public results

Latest public certified results:

`/results`

Award-specific results:

`/awards/{award-slug}/results`

For the current award, the eventual route will be:

`/awards/50-most-influential-students-award-sierra-leone/results`

The admin Results page shows a direct public-results link after publication.

Historical result display uses snapshot names/codes/categories rather than
depending on a nominee remaining publicly active forever.

## 10. Apply sequence

1. Run `0014_results_certification.sql`.
2. Add all new files.
3. Replace `app/admin/awards/results/page.tsx`.
4. Commit and deploy.
5. Confirm Vercel is green.
6. Open `/admin/awards/results`.
7. Test with a stage/test edition first.
8. Run `CHECK_PHASE8_RESULTS.sql`.
9. Only publish a real edition after Finance reconciliation is clean and the
   organization has approved the selected category winners.

## 11. Important boundary

This phase does not add a two-person approval requirement because that was not
part of the agreed V1 requirement.

It also does not allow the general Edition editor to publish results. The
existing Edition management already protects `results_review` and
`results_published` from ordinary lifecycle editing.

## Next roadmap item

After Results Certification is verified:

Users & Roles + Audit administration

Then:

Nominee Portal completion

Then:

Public CMS / removal of remaining demo content.
