import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type PermissionCode =
  | 'admin.access'
  | 'programs.manage'
  | 'awards.manage'
  | 'nominations.review'
  | 'voting.manage'
  | 'results.manage'
  | 'events.manage'
  | 'finance.manage'
  | 'checkin.use'
  | 'content.manage'
  | 'users.manage'
  | 'audit.read'
  | 'settings.manage'
  | 'nominee.portal'

export type PermissionScopeType =
  | 'award'
  | 'award_edition'
  | 'event'

function loginUrl(nextPath: string) {
  return `/login?next=${encodeURIComponent(nextPath)}`
}

export async function requireAuthenticated(
  nextPath = '/',
) {
  const supabase = await createClient()
  const { data, error } =
    await supabase.auth.getClaims()
  const userId = data?.claims?.sub

  if (error || !userId) {
    redirect(loginUrl(nextPath))
  }

  return {
    supabase,
    userId,
    claims: data.claims,
  }
}

export async function requirePermission(
  permission: PermissionCode,
  nextPath: string,
  scopeType: PermissionScopeType | null = null,
  scopeId: string | null = null,
) {
  const {
    supabase,
    userId,
    claims,
  } = await requireAuthenticated(nextPath)

  if (
    (scopeType === null && scopeId !== null) ||
    (scopeType !== null && !scopeId)
  ) {
    redirect('/unauthorized')
  }

  const { data, error } = await supabase.rpc(
    'has_permission',
    {
      requested_permission_code: permission,
      requested_scope_type: scopeType,
      requested_scope_id: scopeId,
    },
  )

  if (error || data !== true) {
    redirect('/unauthorized')
  }

  return {
    supabase,
    userId,
    claims,
  }
}

/**
 * Allows a user into a workspace when they hold a permission through
 * either a global assignment or any valid scoped assignment.
 *
 * This is intentionally separate from requirePermission(). It must not
 * be used to authorize a mutation against a specific record.
 */
export async function requireAnyAssignedPermission(
  permission: PermissionCode,
  nextPath: string,
) {
  const {
    supabase,
    userId,
    claims,
  } = await requireAuthenticated(nextPath)

  const { data, error } = await supabase.rpc(
    'has_any_permission',
    {
      requested_permission_code: permission,
    },
  )

  if (error || data !== true) {
    redirect('/unauthorized')
  }

  return {
    supabase,
    userId,
    claims,
  }
}

export async function requireAnyPermission(
  permissions: PermissionCode[],
  nextPath: string,
) {
  const {
    supabase,
    userId,
    claims,
  } = await requireAuthenticated(nextPath)

  for (const permission of permissions) {
    const { data, error } = await supabase.rpc(
      'has_permission',
      {
        requested_permission_code: permission,
        requested_scope_type: null,
        requested_scope_id: null,
      },
    )

    if (!error && data === true) {
      return {
        supabase,
        userId,
        claims,
        permission,
      }
    }
  }

  redirect('/unauthorized')
}
