# Phase 9 — Users & Roles + Audit Administration

This phase follows the agreed roadmap after Results Certification.

## Repo state checked before this phase

The current `main` branch contains the Results Certification work and the
latest Vercel status is green.

The existing pages were still demo shells:

- `/admin/users`
- `/admin/audit`

The backend RBAC foundation already exists:

- profiles
- roles
- permissions
- role_permissions
- user_roles
- audit_logs
- global and scoped permission checks

## Files

New:

- `supabase/migrations/0015_access_admin_hardening.sql`
- `lib/access/data.ts`
- `lib/access/actions.ts`
- `components/portal/users-roles-audit.tsx`

Replace:

- `app/admin/users/page.tsx`
- `app/admin/audit/page.tsx`

No npm package, CSS or environment-variable change is required.

## 1. Run migration

Run:

`supabase/migrations/0015_access_admin_hardening.sql`

in the correct Supabase project.

### Why this migration matters

Profiles already support:

- active
- suspended
- disabled

But the original `has_permission()` and `has_role()` functions did not check
profile status.

Migration 0015 makes suspension/disablement operational:

- active profile -> role/permission checks work
- suspended profile -> role/permission checks return false
- disabled profile -> role/permission checks return false

It also updates `current_role_codes()` so inactive users do not retain active
global role codes.

## 2. Users & Roles

Open:

`/admin/users`

Only users with `users.manage` can access it.

### Staff invitation

The page can send a Supabase Auth invitation using the existing server-only
admin client.

The invite creates/updates the staff profile and can optionally assign an
initial role.

Nominee Portal access is intentionally NOT managed from this screen. Nominee
accounts continue to use the nominee-account linking workflow.

### Role assignments

Supported operational scopes:

- Super Admin -> Global only
- Awards Manager -> Global or Award Edition
- Nomination Officer -> Global or Award Edition
- Voting Manager -> Global or Award Edition
- Event Manager -> Global or Event
- Finance Officer -> Global only
- Check-In Officer -> Global or Event
- Content Manager -> Global only
- Auditor -> Global only

This matches how current permission checks are actually called in the system.
The UI does not offer generic scope assignments that would look valid but have
no effect.

### Safety rules

The system blocks:

- suspending/disabling your own current account
- removing your own global Super Admin role
- disabling/removing the last active global Super Admin
- staff-side assignment of the Nominee role
- invalid role/scope combinations

Every successful invitation, profile edit, status change, role assignment and
role removal is written to `audit_logs`.

### User deletion

User deletion is intentionally not exposed.

Operational identities may be referenced by:

- finance
- results
- ticketing
- check-in
- audit history

Use Suspend or Disable instead.

## 3. Role matrix

The same page shows the current system role -> permission matrix.

Role definitions are read-only in the UI.

This is intentional: changing what a system role means is a platform-security
change and should remain migration-controlled. Staff assignment/removal is the
day-to-day admin operation.

## 4. Audit Logs

Open:

`/admin/audit`

Only users with `audit.read` can access it.

The page is read-only and provides filters for:

- actor
- action text
- entity type
- from date
- to date

Each audit row can expand to show:

- before state
- after state
- metadata

The page also identifies system/service-originated events where no actor user
was recorded.

## 5. Apply sequence

1. Run `0015_access_admin_hardening.sql`.
2. Add the new `lib/access` files.
3. Add `components/portal/users-roles-audit.tsx`.
4. Replace the Users and Audit page files.
5. Commit and deploy.
6. Confirm Vercel build is green.
7. Run `CHECK_PHASE9_ACCESS_AUDIT.sql`.

## 6. Acceptance test

Use a test staff email if possible.

### Invite

- invite user
- user appears in Users & Roles
- role assignment appears
- audit record appears

### Scoped Award role

Assign Awards Manager or Voting Manager to one Award Edition.

Confirm it does not become a global role.

### Scoped Event role

Assign Check-In Officer to one Event.

Confirm the scanner shows only the permitted event.

### Suspension

Suspend a non-admin test user.

Confirm their permission-protected workspace becomes inaccessible.

Re-activate them and confirm access returns.

### Super Admin protection

Do not test by risking the only real Super Admin.

The SQL verification must show:

`active_global_super_admins >= 1`

## Next roadmap item

After Phase 9 is verified:

Nominee Portal completion

Priority order:

1. Live nominee Profile
2. Campaign tools / personal voting URL / QR
3. Performance trends
4. Announcements
5. Documents
6. Ceremony pass

After that:

Public CMS and removal of remaining demo/mock content.
