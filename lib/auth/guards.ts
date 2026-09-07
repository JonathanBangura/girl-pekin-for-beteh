import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

type PermissionCode =
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

function loginUrl(nextPath: string) {
  return `/login?next=${encodeURIComponent(nextPath)}`
}

export async function requireAuthenticated(nextPath = '/') {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub

  if (error || !userId) {
    redirect(loginUrl(nextPath))
  }

  return { supabase, userId, claims: data.claims }
}

export async function requirePermission(
  permission: PermissionCode,
  nextPath: string,
) {
  const { supabase, userId, claims } = await requireAuthenticated(nextPath)

  const { data, error } = await supabase.rpc('has_permission', {
    requested_permission_code: permission,
    requested_scope_type: null,
    requested_scope_id: null,
  })

  if (error || data !== true) {
    redirect('/unauthorized')
  }

  return { supabase, userId, claims }
}

export async function requireAnyPermission(
  permissions: PermissionCode[],
  nextPath: string,
) {
  const { supabase, userId, claims } = await requireAuthenticated(nextPath)

  for (const permission of permissions) {
    const { data, error } = await supabase.rpc('has_permission', {
      requested_permission_code: permission,
      requested_scope_type: null,
      requested_scope_id: null,
    })

    if (!error && data === true) {
      return { supabase, userId, claims, permission }
    }
  }

  redirect('/unauthorized')
}
