'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requirePermission } from '@/lib/auth/guards'
import { createAdminClient } from '@/lib/supabase/admin'

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim()
}

function integer(formData: FormData, key: string, fallback = 0) {
  const parsed = Number.parseInt(text(formData, key), 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

function slugify(value: string) {
  return value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function refreshAwards() {
  revalidatePath('/admin')
  revalidatePath('/admin/awards')
  revalidatePath('/admin/awards/categories')
  revalidatePath('/admin/awards/nominees')
  revalidatePath('/awards')
  revalidatePath('/nominees')
}

async function audit({
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
  const { error } = await admin.from('audit_logs').insert({
    actor_user_id: actorUserId,
    action,
    entity_type: entityType,
    entity_id: entityId || null,
    old_data: oldData ?? null,
    new_data: newData ?? null,
    metadata: metadata ?? {},
  })

  if (error) console.error('audit log insert failed', error)
}

const nomineeStatuses = new Set([
  'draft',
  'submitted',
  'under_review',
  'approved',
  'published',
  'suspended',
  'disqualified',
  'withdrawn',
  'archived',
])

export async function createCategory(formData: FormData) {
  const { userId } = await requirePermission(
    'awards.manage',
    '/admin/awards/categories',
  )

  const awardEditionId = text(formData, 'award_edition_id')
  const name = text(formData, 'name')
  const description = text(formData, 'description')
  const sortOrder = integer(formData, 'sort_order')
  const isPublic = formData.get('is_public') === 'on'
  const isActive = formData.get('is_active') === 'on'

  if (!awardEditionId || !name) {
    redirect('/admin/awards/categories?error=missing_fields')
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('award_categories')
    .insert({
      award_edition_id: awardEditionId,
      slug: slugify(name),
      name,
      description: description || null,
      is_public: isPublic,
      is_active: isActive,
      sort_order: sortOrder,
      created_by: userId,
    })
    .select()
    .single()

  if (error || !data) {
    console.error('createCategory', error)
    redirect(
      `/admin/awards/categories?error=${encodeURIComponent(error?.code || 'create_failed')}`,
    )
  }

  await audit({
    admin,
    actorUserId: userId,
    action: 'category_created',
    entityType: 'award_category',
    entityId: data.id,
    newData: data,
  })

  refreshAwards()
  redirect('/admin/awards/categories?created=1')
}

export async function updateCategory(formData: FormData) {
  const { userId } = await requirePermission(
    'awards.manage',
    '/admin/awards/categories',
  )

  const categoryId = text(formData, 'category_id')
  const name = text(formData, 'name')
  const description = text(formData, 'description')
  const sortOrder = integer(formData, 'sort_order')
  const isPublic = formData.get('is_public') === 'on'
  const isActive = formData.get('is_active') === 'on'

  if (!categoryId || !name) {
    redirect('/admin/awards/categories?error=missing_fields')
  }

  const admin = createAdminClient()
  const { data: oldData } = await admin
    .from('award_categories')
    .select('*')
    .eq('id', categoryId)
    .maybeSingle()

  if (!oldData) redirect('/admin/awards/categories?error=not_found')

  const { data: newData, error } = await admin
    .from('award_categories')
    .update({
      name,
      slug: slugify(name),
      description: description || null,
      sort_order: sortOrder,
      is_public: isPublic,
      is_active: isActive,
    })
    .eq('id', categoryId)
    .select()
    .single()

  if (error || !newData) {
    console.error('updateCategory', error)
    redirect(
      `/admin/awards/categories?error=${encodeURIComponent(error?.code || 'update_failed')}`,
    )
  }

  await audit({
    admin,
    actorUserId: userId,
    action: 'category_updated',
    entityType: 'award_category',
    entityId: categoryId,
    oldData,
    newData,
  })

  refreshAwards()
  redirect('/admin/awards/categories?updated=1')
}

export async function createNominee(formData: FormData) {
  const { userId } = await requirePermission(
    'awards.manage',
    '/admin/awards/nominees',
  )

  const awardEditionId = text(formData, 'award_edition_id')
  const categoryId = text(formData, 'category_id')
  const nomineeCode = text(formData, 'nominee_code').toUpperCase()
  const fullName = text(formData, 'full_name')
  const institution = text(formData, 'institution')
  const bio = text(formData, 'bio')
  const photoUrl = text(formData, 'photo_url')
  const status = text(formData, 'status') || 'draft'
  const sortOrder = integer(formData, 'sort_order')
  const isPublic = formData.get('is_public') === 'on'

  if (!awardEditionId || !categoryId || !nomineeCode || !fullName) {
    redirect('/admin/awards/nominees?error=missing_fields')
  }

  if (!nomineeStatuses.has(status)) {
    redirect('/admin/awards/nominees?error=invalid_status')
  }

  const admin = createAdminClient()
  const { data: category } = await admin
    .from('award_categories')
    .select('id, award_edition_id')
    .eq('id', categoryId)
    .maybeSingle()

  if (!category || category.award_edition_id !== awardEditionId) {
    redirect('/admin/awards/nominees?error=category_mismatch')
  }

  const { data, error } = await admin
    .from('nominees')
    .insert({
      award_edition_id: awardEditionId,
      category_id: categoryId,
      nominee_code: nomineeCode,
      full_name: fullName,
      institution: institution || null,
      bio: bio || null,
      photo_url: photoUrl || null,
      status,
      is_public: status === 'published' ? isPublic : false,
      sort_order: sortOrder,
      created_by: userId,
    })
    .select()
    .single()

  if (error || !data) {
    console.error('createNominee', error)
    redirect(
      `/admin/awards/nominees?error=${encodeURIComponent(error?.code || 'create_failed')}`,
    )
  }

  await audit({
    admin,
    actorUserId: userId,
    action: 'nominee_created',
    entityType: 'nominee',
    entityId: data.id,
    newData: data,
  })

  refreshAwards()
  redirect('/admin/awards/nominees?created=1')
}

export async function updateNominee(formData: FormData) {
  const { userId } = await requirePermission(
    'awards.manage',
    '/admin/awards/nominees',
  )

  const nomineeId = text(formData, 'nominee_id')
  const categoryId = text(formData, 'category_id')
  const nomineeCode = text(formData, 'nominee_code').toUpperCase()
  const fullName = text(formData, 'full_name')
  const institution = text(formData, 'institution')
  const bio = text(formData, 'bio')
  const photoUrl = text(formData, 'photo_url')
  const status = text(formData, 'status')
  const sortOrder = integer(formData, 'sort_order')
  const isPublic = formData.get('is_public') === 'on'

  if (!nomineeId || !categoryId || !nomineeCode || !fullName) {
    redirect('/admin/awards/nominees?error=missing_fields')
  }

  if (!nomineeStatuses.has(status)) {
    redirect('/admin/awards/nominees?error=invalid_status')
  }

  const admin = createAdminClient()
  const { data: oldData } = await admin
    .from('nominees')
    .select('*')
    .eq('id', nomineeId)
    .maybeSingle()

  if (!oldData) redirect('/admin/awards/nominees?error=not_found')

  const { data: category } = await admin
    .from('award_categories')
    .select('id, award_edition_id')
    .eq('id', categoryId)
    .maybeSingle()

  if (!category || category.award_edition_id !== oldData.award_edition_id) {
    redirect('/admin/awards/nominees?error=category_mismatch')
  }

  const { data: newData, error } = await admin
    .from('nominees')
    .update({
      category_id: categoryId,
      nominee_code: nomineeCode,
      full_name: fullName,
      institution: institution || null,
      bio: bio || null,
      photo_url: photoUrl || null,
      status,
      is_public: status === 'published' ? isPublic : false,
      sort_order: sortOrder,
    })
    .eq('id', nomineeId)
    .select()
    .single()

  if (error || !newData) {
    console.error('updateNominee', error)
    redirect(
      `/admin/awards/nominees?error=${encodeURIComponent(error?.code || 'update_failed')}`,
    )
  }

  await audit({
    admin,
    actorUserId: userId,
    action: 'nominee_updated',
    entityType: 'nominee',
    entityId: nomineeId,
    oldData,
    newData,
  })

  refreshAwards()
  revalidatePath(`/nominees/${newData.nominee_code}`)
  redirect('/admin/awards/nominees?updated=1')
}

export async function changeNomineeStatus(formData: FormData) {
  const { userId } = await requirePermission(
    'awards.manage',
    '/admin/awards/nominees',
  )

  const nomineeId = text(formData, 'nominee_id')
  const status = text(formData, 'status')

  if (!nomineeId || !nomineeStatuses.has(status)) {
    redirect('/admin/awards/nominees?error=invalid_status')
  }

  const admin = createAdminClient()
  const { data: oldData } = await admin
    .from('nominees')
    .select('*')
    .eq('id', nomineeId)
    .maybeSingle()

  if (!oldData) redirect('/admin/awards/nominees?error=not_found')

  const { data: newData, error } = await admin
    .from('nominees')
    .update({
      status,
      is_public: status === 'published',
    })
    .eq('id', nomineeId)
    .select()
    .single()

  if (error || !newData) {
    redirect('/admin/awards/nominees?error=status_update_failed')
  }

  await audit({
    admin,
    actorUserId: userId,
    action: `nominee_${status}`,
    entityType: 'nominee',
    entityId: nomineeId,
    oldData,
    newData,
  })

  refreshAwards()
  revalidatePath(`/nominees/${newData.nominee_code}`)
  redirect('/admin/awards/nominees?updated=1')
}

async function findAuthUserByEmail(
  admin: ReturnType<typeof createAdminClient>,
  email: string,
) {
  const normalized = email.toLowerCase()

  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 100,
    })

    if (error) throw error

    const user = data.users.find(
      (item) => item.email?.toLowerCase() === normalized,
    )

    if (user) return user
    if (data.users.length < 100) break
  }

  return null
}

export async function linkNomineeUser(formData: FormData) {
  const { userId } = await requirePermission(
    'users.manage',
    '/admin/awards/nominees',
  )

  const nomineeId = text(formData, 'nominee_id')
  const email = text(formData, 'email').toLowerCase()

  if (!nomineeId || !email) {
    redirect('/admin/awards/nominees?error=missing_link_fields')
  }

  const admin = createAdminClient()
  const authUser = await findAuthUserByEmail(admin, email)

  if (!authUser) {
    redirect('/admin/awards/nominees?error=auth_user_not_found')
  }

  const { data: oldData } = await admin
    .from('nominees')
    .select('*')
    .eq('id', nomineeId)
    .maybeSingle()

  if (!oldData) redirect('/admin/awards/nominees?error=not_found')

  const { data: nomineeRole } = await admin
    .from('roles')
    .select('id')
    .eq('code', 'nominee')
    .maybeSingle()

  if (!nomineeRole) {
    redirect('/admin/awards/nominees?error=nominee_role_missing')
  }

  const { data: existingRole } = await admin
    .from('user_roles')
    .select('id')
    .eq('user_id', authUser.id)
    .eq('role_id', nomineeRole.id)
    .eq('scope_type', 'global')
    .is('scope_id', null)
    .maybeSingle()

  if (!existingRole) {
    const { error: roleError } = await admin.from('user_roles').insert({
      user_id: authUser.id,
      role_id: nomineeRole.id,
      scope_type: 'global',
      scope_id: null,
      assigned_by: userId,
    })

    if (roleError) {
      console.error('link nominee role', roleError)
      redirect('/admin/awards/nominees?error=role_assignment_failed')
    }
  }

  const { data: newData, error } = await admin
    .from('nominees')
    .update({ auth_user_id: authUser.id })
    .eq('id', nomineeId)
    .select()
    .single()

  if (error || !newData) {
    redirect('/admin/awards/nominees?error=link_failed')
  }

  await audit({
    admin,
    actorUserId: userId,
    action: 'nominee_user_linked',
    entityType: 'nominee',
    entityId: nomineeId,
    oldData,
    newData,
    metadata: { email },
  })

  revalidatePath('/admin/awards/nominees')
  revalidatePath('/nominee')
  redirect('/admin/awards/nominees?linked=1')
}

export async function unlinkNomineeUser(formData: FormData) {
  const { userId } = await requirePermission(
    'users.manage',
    '/admin/awards/nominees',
  )

  const nomineeId = text(formData, 'nominee_id')
  if (!nomineeId) {
    redirect('/admin/awards/nominees?error=missing_nominee')
  }

  const admin = createAdminClient()
  const { data: oldData } = await admin
    .from('nominees')
    .select('*')
    .eq('id', nomineeId)
    .maybeSingle()

  if (!oldData) redirect('/admin/awards/nominees?error=not_found')

  const linkedUserId = oldData.auth_user_id

  const { data: newData, error } = await admin
    .from('nominees')
    .update({ auth_user_id: null })
    .eq('id', nomineeId)
    .select()
    .single()

  if (error || !newData) {
    redirect('/admin/awards/nominees?error=unlink_failed')
  }

  if (linkedUserId) {
    const { count } = await admin
      .from('nominees')
      .select('id', { count: 'exact', head: true })
      .eq('auth_user_id', linkedUserId)

    if ((count ?? 0) === 0) {
      const { data: nomineeRole } = await admin
        .from('roles')
        .select('id')
        .eq('code', 'nominee')
        .maybeSingle()

      if (nomineeRole) {
        await admin
          .from('user_roles')
          .delete()
          .eq('user_id', linkedUserId)
          .eq('role_id', nomineeRole.id)
          .eq('scope_type', 'global')
          .is('scope_id', null)
      }
    }
  }

  await audit({
    admin,
    actorUserId: userId,
    action: 'nominee_user_unlinked',
    entityType: 'nominee',
    entityId: nomineeId,
    oldData,
    newData,
  })

  revalidatePath('/admin/awards/nominees')
  revalidatePath('/nominee')
  redirect('/admin/awards/nominees?linked=0')
}
