# Phase 2 — Supabase Auth + Route Protection

This package is designed for the current Next.js 16 App Router project.

## 1. Install packages and update BOTH package.json and pnpm-lock.yaml

Run from the repository root:

```bash
pnpm add @supabase/supabase-js @supabase/ssr
```

Do not manually edit package.json without also updating pnpm-lock.yaml.

## 2. Add the files from this package

New:
- lib/supabase/client.ts
- lib/supabase/server.ts
- lib/supabase/proxy.ts
- lib/auth/guards.ts
- proxy.ts
- components/auth/login-form.tsx
- app/login/page.tsx
- app/login/login.module.css
- app/unauthorized/page.tsx
- app/auth/signout/route.ts
- app/auth/callback/route.ts
- app/scan/layout.tsx
- .env.example

Replace:
- app/admin/layout.tsx
- app/nominee/layout.tsx

## 3. Add environment variables in the CORRECT Vercel project

Required:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

Get them from the correct Supabase project's Connect/API Keys screen.

## 4. Create the first Auth user

In the correct Supabase project:
Authentication -> Users -> Add user

Create the administrator email/password and confirm the user.

## 5. Bootstrap the first Super Admin in SQL Editor

Replace the email:

```sql
select public.bootstrap_super_admin('admin@example.com');
```

Verify:

```sql
select
  u.email,
  r.code as role_code
from auth.users u
join public.user_roles ur on ur.user_id = u.id
join public.roles r on r.id = ur.role_id
where lower(u.email) = lower('admin@example.com');
```

Expected role_code: super_admin

## 6. Deploy and test

- /login should load publicly.
- /admin should redirect to /login when signed out.
- Super Admin should be able to sign in and access /admin.
- /nominee requires nominee.portal.
- /scan requires checkin.use OR events.manage.
- /unauthorized is shown to authenticated users without permission.

## Important

The Proxy only refreshes/validates the cookie session. Authorization is enforced again
inside the protected server layouts using `getClaims()` + the database permission RPC.

The Proxy intentionally returns NextResponse.next() when Supabase environment variables
are absent, so simply adding the files will not crash the current public site while
staging. However, the protected layouts require the environment variables before those
routes are used.
