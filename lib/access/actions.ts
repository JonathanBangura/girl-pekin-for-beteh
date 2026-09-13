'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requirePermission } from '@/lib/auth/guards'
import { createAdminClient } from '@/lib/supabase/admin'

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim()
}

function refreshAccess() {
  revalidatePath('/admin')
  revalidatePath('/admin/users')
  revalidatePath('/admin/audit')
}

async function writeAudit({
  admin,
  actorUserId,
  action,
  entityType,
  entityId,
  oldData,
  newData,
  metadata,
}: {
  admin: ReturnType<typeof createAdminClient>
  actorUserId: string
  action: string
  entityType: string
  entityId?: string | null
  oldData?: unknown
  newData?: unknown
  metadata?: Record<string, unknown>
}) {
  const { error } = await admin
    .from('audit_logs')
    .insert({
      actor_user_id: actorUserId,
      action,
      entity_type: entityType,
      entity_id: entityId ?? null,
      old_data: oldData ?? null,
      new_data: newData ?? null,
      metadata: metadata ?? {},
    })

  if (error) {
    console.error('access audit insert failed', error)
  }
}

async function getRoleById(
  admin: ReturnType<typeof createAdminClient>,
  roleId: string,
) {
  const { data, error } = await admin
    .from('roles')
    .select('id,code,name,description')
    .eq('id', roleId)
    .maybeSingle()

  if (error || !data) {
    throw new Error('role_not_found')
  }

  return data
}

function parseScopeRef(scopeRef: string) {
  if (!scopeRef || scopeRef === 'global') {
    return {
      scope_type: 'global',
      scope_id: null as string | null,
    }
  }

  const [scopeType, scopeId] = scopeRef.split(':', 2)

  if (
    !['award', 'award_edition', 'event'].includes(scopeType) ||
    !scopeId
  ) {
    throw new Error('invalid_scope')
  }

  return {
    scope_type: scopeType,
    scope_id: scopeId,
  }
}

async function validateScope({
  admin,
  roleCode,
  scopeType,
  scopeId,
}: {
  admin: ReturnType<typeof createAdminClient>
  roleCode: string
  scopeType: string
  scopeId: string | null
}) {
  const allowedScopes: Record<string, Set<string>> = {
    super_admin: new Set(['global']),
    awards_manager: new Set(['global', 'award_edition']),
    nomination_officer: new Set(['global', 'award_edition']),
    voting_manager: new Set(['global', 'award_edition']),
    event_manager: new Set(['global', 'event']),
    finance_officer: new Set(['global']),
    checkin_officer: new Set(['global', 'event']),
    content_manager: new Set(['global']),
    auditor: new Set(['global']),
    nominee: new Set(['global']),
  }

  const permitted =
    allowedScopes[roleCode] ?? new Set(['global'])

  if (!permitted.has(scopeType)) {
    throw new Error('role_scope_invalid')
  }

  if (scopeType === 'global') return

  if (!scopeId) {
    throw new Error('invalid_scope')
  }

  const table =
    scopeType === 'award_edition'
      ? 'award_editions'
      : scopeType === 'event'
        ? 'events'
        : 'awards'

  const { data, error } = await admin
    .from(table)
    .select('id')
    .eq('id', scopeId)
    .maybeSingle()

  if (error || !data) {
    throw new Error('scope_not_found')
  }
}

async function ensureNotLastActiveSuperAdmin({
  admin,
  targetUserId,
}: {
  admin: ReturnType<typeof createAdminClient>
  targetUserId: string
}) {
  const { data: superRole } = await admin
    .from('roles')
    .select('id')
    .eq('code', 'super_admin')
    .maybeSingle()

  if (!superRole) return

  const { data: assignments, error } = await admin
    .from('user_roles')
    .select('user_id')
    .eq('role_id', superRole.id)
    .eq('scope_type', 'global')
    .is('scope_id', null)

  if (error) {
    throw new Error('super_admin_check_failed')
  }

  const candidateIds = [
    ...new Set(
      (assignments ?? []).map((item) => item.user_id),
    ),
  ]

  if (!candidateIds.length) {
    throw new Error('last_super_admin')
  }

  const { data: activeProfiles, error: profileError } =
    await admin
      .from('profiles')
      .select('id,status')
      .in('id', candidateIds)
      .eq('status', 'active')

  if (profileError) {
    throw new Error('super_admin_check_failed')
  }

  const activeIds = new Set(
    (activeProfiles ?? []).map((profile) => profile.id),
  )

  if (
    activeIds.has(targetUserId) &&
    activeIds.size <= 1
  ) {
    throw new Error('last_super_admin')
  }
}

export async function inviteStaffUser(
  formData: FormData,
) {
  const { userId } = await requirePermission(
    'users.manage',
    '/admin/users',
  )

  const email = text(formData, 'email').toLowerCase()
  const fullName = text(formData, 'full_name')
  const phone = text(formData, 'phone')
  const roleId = text(formData, 'role_id')
  const scopeRef = text(formData, 'scope_ref') || 'global'

  if (!email || !email.includes('@') || !fullName) {
    redirect('/admin/users?error=missing_invite_fields')
  }

  const admin = createAdminClient()

  const { data: inviteData, error: inviteError } =
    await admin.auth.admin.inviteUserByEmail(email, {
      data: {
        full_name: fullName,
      },
    })

  if (inviteError || !inviteData.user) {
    console.error('inviteStaffUser', inviteError)
    redirect(
      `/admin/users?error=${encodeURIComponent(
        inviteError?.code || 'invite_failed',
      )}`,
    )
  }

  const invitedUserId = inviteData.user.id

  const { error: profileError } = await admin
    .from('profiles')
    .upsert(
      {
        id: invitedUserId,
        full_name: fullName,
        phone: phone || null,
        status: 'active',
      },
      {
        onConflict: 'id',
      },
    )

  if (profileError) {
    console.error(
      'inviteStaffUser profile',
      profileError,
    )
  }

  await writeAudit({
    admin,
    actorUserId: userId,
    action: 'staff_user_invited',
    entityType: 'profile',
    entityId: invitedUserId,
    newData: {
      email,
      full_name: fullName,
      phone: phone || null,
    },
  })

  if (roleId) {
    try {
      const role = await getRoleById(admin, roleId)

      if (role.code === 'nominee') {
        throw new Error('nominee_role_managed_elsewhere')
      }

      const parsed = parseScopeRef(scopeRef)

      await validateScope({
        admin,
        roleCode: role.code,
        scopeType: parsed.scope_type,
        scopeId: parsed.scope_id,
      })

      const { data: assignment, error: assignmentError } =
        await admin
          .from('user_roles')
          .insert({
            user_id: invitedUserId,
            role_id: role.id,
            scope_type: parsed.scope_type,
            scope_id: parsed.scope_id,
            assigned_by: userId,
          })
          .select()
          .single()

      if (assignmentError) {
        console.error(
          'inviteStaffUser role assignment',
          assignmentError,
        )
      } else if (assignment) {
        await writeAudit({
          admin,
          actorUserId: userId,
          action: 'user_role_assigned',
          entityType: 'user_role',
          entityId: assignment.id,
          newData: {
            user_id: invitedUserId,
            role_code: role.code,
            scope_type: parsed.scope_type,
            scope_id: parsed.scope_id,
          },
        })
      }
    } catch (error) {
      console.error(
        'inviteStaffUser optional role failed',
        error,
      )

      refreshAccess()
      redirect(
        '/admin/users?invited=1&warning=role_assignment_failed',
      )
    }
  }

  refreshAccess()
  redirect('/admin/users?invited=1')
}

export async function updateStaffProfile(
  formData: FormData,
) {
  const { userId } = await requirePermission(
    'users.manage',
    '/admin/users',
  )

  const targetUserId = text(formData, 'user_id')
  const fullName = text(formData, 'full_name')
  const phone = text(formData, 'phone')

  if (!targetUserId || !fullName) {
    redirect('/admin/users?error=missing_profile_fields')
  }

  const admin = createAdminClient()

  const { data: oldData } = await admin
    .from('profiles')
    .select('*')
    .eq('id', targetUserId)
    .maybeSingle()

  if (!oldData) {
    redirect('/admin/users?error=user_not_found')
  }

  const { data: newData, error } = await admin
    .from('profiles')
    .update({
      full_name: fullName,
      phone: phone || null,
    })
    .eq('id', targetUserId)
    .select()
    .single()

  if (error || !newData) {
    console.error('updateStaffProfile', error)
    redirect('/admin/users?error=profile_update_failed')
  }

  await writeAudit({
    admin,
    actorUserId: userId,
    action: 'staff_profile_updated',
    entityType: 'profile',
    entityId: targetUserId,
    oldData,
    newData,
  })

  refreshAccess()
  redirect('/admin/users?updated=1')
}

export async function setStaffStatus(
  formData: FormData,
) {
  const { userId } = await requirePermission(
    'users.manage',
    '/admin/users',
  )

  const targetUserId = text(formData, 'user_id')
  const status = text(formData, 'status')

  if (
    !targetUserId ||
    !['active', 'suspended', 'disabled'].includes(status)
  ) {
    redirect('/admin/users?error=invalid_status')
  }

  if (
    targetUserId === userId &&
    status !== 'active'
  ) {
    redirect('/admin/users?error=cannot_suspend_self')
  }

  const admin = createAdminClient()

  if (status !== 'active') {
    try {
      await ensureNotLastActiveSuperAdmin({
        admin,
        targetUserId,
      })
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === 'last_super_admin'
      ) {
        redirect('/admin/users?error=last_super_admin')
      }
      throw error
    }
  }

  const { data: oldData } = await admin
    .from('profiles')
    .select('*')
    .eq('id', targetUserId)
    .maybeSingle()

  if (!oldData) {
    redirect('/admin/users?error=user_not_found')
  }

  const { data: newData, error } = await admin
    .from('profiles')
    .update({ status })
    .eq('id', targetUserId)
    .select()
    .single()

  if (error || !newData) {
    console.error('setStaffStatus', error)
    redirect('/admin/users?error=status_update_failed')
  }

  await writeAudit({
    admin,
    actorUserId: userId,
    action: 'staff_user_status_changed',
    entityType: 'profile',
    entityId: targetUserId,
    oldData: {
      status: oldData.status,
    },
    newData: {
      status: newData.status,
    },
  })

  refreshAccess()
  redirect('/admin/users?status_updated=1')
}

export async function assignUserRole(
  formData: FormData,
) {
  const { userId } = await requirePermission(
    'users.manage',
    '/admin/users',
  )

  const targetUserId = text(formData, 'user_id')
  const roleId = text(formData, 'role_id')
  const scopeRef = text(formData, 'scope_ref') || 'global'

  if (!targetUserId || !roleId) {
    redirect('/admin/users?error=missing_role_fields')
  }

  const admin = createAdminClient()

  try {
    const role = await getRoleById(admin, roleId)

    if (role.code === 'nominee') {
      redirect(
        '/admin/users?error=nominee_role_managed_elsewhere',
      )
    }

    const parsed = parseScopeRef(scopeRef)

    await validateScope({
      admin,
      roleCode: role.code,
      scopeType: parsed.scope_type,
      scopeId: parsed.scope_id,
    })

    const { data: assignment, error } = await admin
      .from('user_roles')
      .insert({
        user_id: targetUserId,
        role_id: roleId,
        scope_type: parsed.scope_type,
        scope_id: parsed.scope_id,
        assigned_by: userId,
      })
      .select()
      .single()

    if (error || !assignment) {
      console.error('assignUserRole', error)

      redirect(
        `/admin/users?error=${encodeURIComponent(
          error?.code || 'role_assignment_failed',
        )}`,
      )
    }

    await writeAudit({
      admin,
      actorUserId: userId,
      action: 'user_role_assigned',
      entityType: 'user_role',
      entityId: assignment.id,
      newData: {
        user_id: targetUserId,
        role_code: role.code,
        scope_type: parsed.scope_type,
        scope_id: parsed.scope_id,
      },
    })
  } catch (error) {
    if (error instanceof Error) {
      const known = new Set([
        'role_not_found',
        'invalid_scope',
        'scope_not_found',
        'role_scope_invalid',
      ])

      if (known.has(error.message)) {
        redirect(
          `/admin/users?error=${encodeURIComponent(
            error.message,
          )}`,
        )
      }
    }

    throw error
  }

  refreshAccess()
  redirect('/admin/users?role_assigned=1')
}

export async function removeUserRole(
  formData: FormData,
) {
  const { userId } = await requirePermission(
    'users.manage',
    '/admin/users',
  )

  const assignmentId = text(formData, 'assignment_id')

  if (!assignmentId) {
    redirect('/admin/users?error=missing_assignment')
  }

  const admin = createAdminClient()

  const { data: assignment, error: loadError } =
    await admin
      .from('user_roles')
      .select(
        'id,user_id,role_id,scope_type,scope_id,assigned_by,created_at',
      )
      .eq('id', assignmentId)
      .maybeSingle()

  if (loadError || !assignment) {
    redirect('/admin/users?error=assignment_not_found')
  }

  const role = await getRoleById(
    admin,
    assignment.role_id,
  )

  if (
    assignment.user_id === userId &&
    role.code === 'super_admin' &&
    assignment.scope_type === 'global'
  ) {
    redirect(
      '/admin/users?error=cannot_remove_own_super_admin',
    )
  }

  if (
    role.code === 'super_admin' &&
    assignment.scope_type === 'global'
  ) {
    try {
      await ensureNotLastActiveSuperAdmin({
        admin,
        targetUserId: assignment.user_id,
      })
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === 'last_super_admin'
      ) {
        redirect('/admin/users?error=last_super_admin')
      }
      throw error
    }
  }

  const { error: deleteError } = await admin
    .from('user_roles')
    .delete()
    .eq('id', assignment.id)

  if (deleteError) {
    console.error('removeUserRole', deleteError)
    redirect('/admin/users?error=role_remove_failed')
  }

  await writeAudit({
    admin,
    actorUserId: userId,
    action: 'user_role_removed',
    entityType: 'user_role',
    entityId: assignment.id,
    oldData: {
      user_id: assignment.user_id,
      role_code: role.code,
      scope_type: assignment.scope_type,
      scope_id: assignment.scope_id,
    },
  })

  refreshAccess()
  redirect('/admin/users?role_removed=1')
}
