# Production QA Fix 2 — Scoped RBAC + Event Management

Base inspected: current `main` after Production QA Fix 1.

This is a direct repository/Vercel patch. It does not require a localhost
environment.

## Why this patch is needed

The role assignment UI supports scoped roles such as:

- Awards Manager / Nomination Officer / Voting Manager scoped to an award edition.
- Event Manager / Check-In Officer scoped to an event.

However, `/admin` currently checks `admin.access` with a null scope. The existing
`has_permission()` correctly treats that as a **global-only** check, which means
valid scoped staff can be assigned but cannot enter the admin workspace.

The fix deliberately does **not** weaken `has_permission()`. Instead it adds
`has_any_permission()` only for workspace-entry/readiness checks, while mutations
continue to require the exact target scope.

It also makes vote-order and vote-ledger RLS edition-aware and completes real
Event create/edit management.

## Apply order

1. In the correct Supabase project, run:
   `supabase/migrations/0019_scoped_access_event_management.sql`

2. Copy the package files into the repo, preserving paths. Replace files with the
   same names.

3. From the repo root run:
   `python APPLY_PRODUCTION_QA_FIX2.py`

   The script only changes two import paths:
   - `components/portal/awards-management-live.tsx`
   - `components/portal/award-edition-management.tsx`

   If editing entirely in the GitHub web UI, make those two changes manually:

   ```text
   @/lib/admin/actions
   -> @/lib/admin/scoped-awards-actions

   @/lib/admin/award-edition-actions
   -> @/lib/admin/scoped-award-edition-actions
   ```

4. Commit to `main` and let Vercel deploy.

5. Wait for the Vercel status to turn green.

6. Run:
   `CHECK_PHASE13_SCOPED_ACCESS_EVENTS.sql`

## What changes

### Admin entry

`app/admin/layout.tsx` now uses `requireAnyAssignedPermission('admin.access')`.

A user can enter the workspace if the permission comes from either:
- a global role assignment, or
- a valid scoped role assignment.

Record mutations still use exact scope checks.

### Awards/categories/nominees

Category and nominee management now reads through the authenticated Supabase
client so RLS limits records to the user's permitted award edition(s).

The new scoped action module authorizes create/update/status operations against
the target `award_edition`.

User-account linking/unlinking remains protected by global `users.manage`.

### Award editions

A scoped Awards Manager can edit an edition they are assigned to.

Global-only operations remain global:
- create an Award
- edit the parent Award record
- create a new Award Edition

A scoped manager cannot move their assigned edition to another parent Award.

### Voting

Vote pricing saves now authorize against the target award edition.

`vote_orders_staff_read` and `vote_ledger_staff_read` now support edition-scoped
Voting/Results access without exposing payment records.

### Results

Results data and all Results workflow actions now respect the exact award edition
scope. The existing SQL results RPCs still perform their own permission checks.

### Ticket types

Ticket-type create/edit now authorizes against the exact Event scope.

An edit cannot move a known ticket type to another event, which closes a
cross-event service-role mutation risk.

### Events

`/admin/events` is now a real management screen.

Global Event Manager / Super Admin:
- create events
- edit accessible events

Event-scoped Event Manager:
- edit assigned event(s)
- cannot create arbitrary new events

Read-only staff who can see events through existing RLS do not receive edit
controls.

Editable event fields:
- title / slug
- summary / description
- venue
- start / end
- access mode
- status
- public visibility
- capacity
- cover image URL

New events start unlinked from an award edition. The Awards workspace remains
responsible for linking an event as an edition ceremony.

## Production acceptance test

Use at least one scoped test account where practical.

### Super Admin
- `/admin` loads.
- Existing admin modules still work.
- Create/edit an event.
- Create/edit ticket type.
- Award/category/nominee workflows still work.

### Edition-scoped Awards Manager
- Can enter `/admin`.
- Can see only permitted award-edition category/nominee data.
- Can create/edit category and nominee inside that edition.
- Can edit that edition.
- Cannot use global Award creation/update or create a new edition.

### Edition-scoped Nomination Officer
- Can enter `/admin`.
- Existing Applications review flow still works for assigned edition only.

### Edition-scoped Voting Manager
- Can enter `/admin`.
- Voting page sees its accessible edition.
- Can save vote pricing for that edition.
- Vote orders/ledger are limited by RLS to the permitted edition.

### Event-scoped Event Manager
- Can enter `/admin`.
- `/admin/events` shows assigned event(s).
- Can edit assigned event.
- Cannot create a new event.
- Can create/edit ticket types only for assigned event.

### Event-scoped Check-In Officer
- Can enter the admin workspace and scanner.
- Existing scanner RPC still enforces event scope.

## Important follow-up

Do **not** delete the legacy mock files in the same commit.

After this patch is green, the next production cleanup can safely remove the old
demo/dead route sources. After that, remove
`typescript.ignoreBuildErrors` from `next.config.mjs` in a separate validation
commit so Vercel starts enforcing TypeScript build errors.
