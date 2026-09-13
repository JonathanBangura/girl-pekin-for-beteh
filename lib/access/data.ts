import { requirePermission } from '@/lib/auth/guards'
import { createAdminClient } from '@/lib/supabase/admin'

function dateStart(value?: string) {
  if (!value) return null
  const parsed = new Date(`${value}T00:00:00Z`)
  return Number.isNaN(parsed.getTime())
    ? null
    : parsed.toISOString()
}

function dateEnd(value?: string) {
  if (!value) return null
  const parsed = new Date(`${value}T23:59:59.999Z`)
  return Number.isNaN(parsed.getTime())
    ? null
    : parsed.toISOString()
}

export async function getUsersAndRolesData() {
  await requirePermission('users.manage', '/admin/users')

  const admin = createAdminClient()

  const [
    profilesResult,
    rolesResult,
    permissionsResult,
    rolePermissionsResult,
    userRolesResult,
    awardsResult,
    editionsResult,
    eventsResult,
    authUsersResult,
  ] = await Promise.all([
    admin
      .from('profiles')
      .select('id,full_name,phone,avatar_url,status,created_at,updated_at')
      .order('created_at', { ascending: false }),
    admin
      .from('roles')
      .select('id,code,name,description,is_system,created_at')
      .order('name', { ascending: true }),
    admin
      .from('permissions')
      .select('id,code,name,description')
      .order('code', { ascending: true }),
    admin
      .from('role_permissions')
      .select('role_id,permission_id'),
    admin
      .from('user_roles')
      .select(
        'id,user_id,role_id,scope_type,scope_id,assigned_by,created_at',
      )
      .order('created_at', { ascending: false }),
    admin
      .from('awards')
      .select('id,name,status')
      .neq('status', 'archived')
      .order('name', { ascending: true }),
    admin
      .from('award_editions')
      .select('id,award_id,year,edition_label,status')
      .neq('status', 'archived')
      .order('year', { ascending: false }),
    admin
      .from('events')
      .select('id,title,status,starts_at')
      .neq('status', 'archived')
      .order('starts_at', { ascending: false }),
    admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    }),
  ])

  for (const [label, result] of [
    ['profiles', profilesResult],
    ['roles', rolesResult],
    ['permissions', permissionsResult],
    ['role permissions', rolePermissionsResult],
    ['user roles', userRolesResult],
    ['awards', awardsResult],
    ['editions', editionsResult],
    ['events', eventsResult],
  ] as const) {
    if (result.error) {
      console.error(`access admin ${label}`, result.error)
      throw new Error(`Unable to load ${label}.`)
    }
  }

  if (authUsersResult.error) {
    console.error('access admin auth users', authUsersResult.error)
    throw new Error('Unable to load authentication users.')
  }

  const roles = rolesResult.data ?? []
  const permissions = permissionsResult.data ?? []
  const rolePermissions = rolePermissionsResult.data ?? []
  const userRoles = userRolesResult.data ?? []

  const roleMap = new Map(
    roles.map((role) => [role.id, role]),
  )
  const permissionMap = new Map(
    permissions.map((permission) => [
      permission.id,
      permission,
    ]),
  )
  const authUserMap = new Map(
    (authUsersResult.data?.users ?? []).map((user) => [
      user.id,
      user,
    ]),
  )

  const awardMap = new Map(
    (awardsResult.data ?? []).map((award) => [
      award.id,
      award,
    ]),
  )
  const editionMap = new Map(
    (editionsResult.data ?? []).map((edition) => [
      edition.id,
      edition,
    ]),
  )
  const eventMap = new Map(
    (eventsResult.data ?? []).map((event) => [
      event.id,
      event,
    ]),
  )

  const enrichedRoles = roles.map((role) => ({
    ...role,
    permissions: rolePermissions
      .filter((item) => item.role_id === role.id)
      .map((item) => permissionMap.get(item.permission_id))
      .filter(Boolean),
  }))

  const profiles = (profilesResult.data ?? []).map(
    (profile) => {
      const authUser = authUserMap.get(profile.id)
      const assignments = userRoles
        .filter((assignment) => assignment.user_id === profile.id)
        .map((assignment) => {
          const role = roleMap.get(assignment.role_id)
          let scope_label = 'Global'

          if (
            assignment.scope_type === 'award' &&
            assignment.scope_id
          ) {
            scope_label =
              awardMap.get(assignment.scope_id)?.name ??
              'Award scope'
          }

          if (
            assignment.scope_type === 'award_edition' &&
            assignment.scope_id
          ) {
            const edition = editionMap.get(assignment.scope_id)
            const award = edition
              ? awardMap.get(edition.award_id)
              : null

            scope_label = edition
              ? `${award?.name ?? 'Award'} · ${
                  edition.edition_label
                } · ${edition.year}`
              : 'Award edition scope'
          }

          if (
            assignment.scope_type === 'event' &&
            assignment.scope_id
          ) {
            scope_label =
              eventMap.get(assignment.scope_id)?.title ??
              'Event scope'
          }

          return {
            ...assignment,
            role: role ?? null,
            scope_label,
          }
        })

      return {
        ...profile,
        email: authUser?.email ?? null,
        email_confirmed_at:
          authUser?.email_confirmed_at ?? null,
        last_sign_in_at:
          authUser?.last_sign_in_at ?? null,
        invited_at:
          authUser?.invited_at ?? null,
        assignments,
      }
    },
  )

  return {
    profiles,
    roles: enrichedRoles,
    permissions,
    awards: awardsResult.data ?? [],
    editions: editionsResult.data ?? [],
    events: eventsResult.data ?? [],
  }
}

export async function getAuditLogData(filters: {
  actor?: string
  action?: string
  entity?: string
  from?: string
  to?: string
}) {
  await requirePermission('audit.read', '/admin/audit')

  const admin = createAdminClient()

  let query = admin
    .from('audit_logs')
    .select(
      'id,actor_user_id,action,entity_type,entity_id,old_data,new_data,metadata,created_at',
    )
    .order('created_at', { ascending: false })
    .limit(1000)

  if (filters.actor) {
    query = query.eq('actor_user_id', filters.actor)
  }

  if (filters.entity) {
    query = query.eq('entity_type', filters.entity)
  }

  if (filters.action) {
    query = query.ilike(
      'action',
      `%${filters.action.trim()}%`,
    )
  }

  const from = dateStart(filters.from)
  const to = dateEnd(filters.to)

  if (from) query = query.gte('created_at', from)
  if (to) query = query.lte('created_at', to)

  const { data: logs, error } = await query

  if (error) {
    console.error('audit logs', error)
    throw new Error('Unable to load audit logs.')
  }

  const actorIds = [
    ...new Set(
      (logs ?? [])
        .map((log) => log.actor_user_id)
        .filter((value): value is string => Boolean(value)),
    ),
  ]

  const profilesResult = actorIds.length
    ? await admin
        .from('profiles')
        .select('id,full_name,status')
        .in('id', actorIds)
    : { data: [], error: null }

  if (profilesResult.error) {
    console.error(
      'audit actor profiles',
      profilesResult.error,
    )
  }

  const profileMap = new Map(
    (profilesResult.data ?? []).map((profile) => [
      profile.id,
      profile,
    ]),
  )

  const authUsersResult = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  })

  const authUserMap = new Map(
    (authUsersResult.data?.users ?? []).map((user) => [
      user.id,
      user,
    ]),
  )

  const actors = actorIds.map((id) => ({
    id,
    full_name:
      profileMap.get(id)?.full_name ||
      authUserMap.get(id)?.email ||
      id,
    email: authUserMap.get(id)?.email ?? null,
  }))

  const entityTypes = [
    ...new Set(
      (logs ?? []).map((log) => log.entity_type),
    ),
  ].sort()

  return {
    logs: (logs ?? []).map((log) => ({
      ...log,
      actor:
        log.actor_user_id
          ? {
              id: log.actor_user_id,
              full_name:
                profileMap.get(log.actor_user_id)
                  ?.full_name ||
                authUserMap.get(log.actor_user_id)
                  ?.email ||
                'Unknown user',
              email:
                authUserMap.get(log.actor_user_id)?.email ??
                null,
            }
          : null,
    })),
    actors,
    entityTypes,
  }
}
