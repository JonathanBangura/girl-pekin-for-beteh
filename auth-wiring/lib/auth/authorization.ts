import 'server-only'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function getAuthClaims() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()

  if (error || !data?.claims?.sub) {
    return null
  }

  return data.claims
}

export async function requireUser(loginPath = '/login') {
  const claims = await getAuthClaims()

  if (!claims) {
    redirect(loginPath)
  }

  return claims
}

export async function hasPermission(
  permissionCode: string,
  scopeType?: 'award' | 'award_edition' | 'event',
  scopeId?: string
) {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('has_permission', {
    requested_permission_code: permissionCode,
    requested_scope_type: scopeType ?? null,
    requested_scope_id: scopeId ?? null,
  })

  if (error) {
    throw error
  }

  return Boolean(data)
}

export async function requirePermission(
  permissionCode: string,
  options?: {
    scopeType?: 'award' | 'award_edition' | 'event'
    scopeId?: string
    loginPath?: string
    forbiddenPath?: string
  }
) {
  await requireUser(options?.loginPath)

  const allowed = await hasPermission(
    permissionCode,
    options?.scopeType,
    options?.scopeId
  )

  if (!allowed) {
    redirect(options?.forbiddenPath ?? '/')
  }
}
