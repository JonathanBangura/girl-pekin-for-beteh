'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  requireAuthenticated,
  requirePermission,
} from '@/lib/auth/guards'
import { createAdminClient } from '@/lib/supabase/admin'

export {
  linkNomineeUser,
  unlinkNomineeUser,
} from '@/lib/admin/actions'

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim()
}

function integer(
  formData: FormData,
  key: string,
  fallback = 0,
) {
  const parsed = Number.parseInt(
    text(formData, key),
    10,
  )
  return Number.isFinite(parsed)
    ? parsed
    : fallback
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
}: {
  admin: ReturnType<typeof createAdminClient>
  actorUserId: string
  action: string
  entityType: string
  entityId?: string | null
  oldData?: unknown
  newData?: unknown
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
      metadata: {},
    })

  if (error) {
    console.error(
      'scoped awards audit insert failed',
      error,
    )
  }
}

const nomineeStatuses = new Set([
  'draft',
  'submitted',
  'under_review',
  'approved',
  'rejected',
  'published',
  'suspended',
  'disqualified',
  'withdrawn',
  'archived',
])

async function loadCategoryForScope(
  categoryId: string,
) {
  const auth = await requireAuthenticated(
    '/admin/awards/categories',
  )

  const { data } = await auth.supabase
    .from('award_categories')
    .select('*')
    .eq('id', categoryId)
    .maybeSingle()

  if (!data) {
    redirect(
      '/admin/awards/categories?error=not_found',
    )
  }

  return data
}

async function loadNomineeForScope(
  nomineeId: string,
) {
  const auth = await requireAuthenticated(
    '/admin/awards/nominees',
  )

  const { data } = await auth.supabase
    .from('nominees')
    .select('*')
    .eq('id', nomineeId)
    .maybeSingle()

  if (!data) {
    redirect(
      '/admin/awards/nominees?error=not_found',
    )
  }

  return data
}

export async function createCategory(
  formData: FormData,
) {
  const awardEditionId = text(
    formData,
    'award_edition_id',
  )
  const name = text(formData, 'name')
  const description = text(
    formData,
    'description',
  )
  const sortOrder = integer(
    formData,
    'sort_order',
  )
  const isPublic =
    formData.get('is_public') === 'on'
  const isActive =
    formData.get('is_active') === 'on'

  if (!awardEditionId || !name) {
    redirect(
      '/admin/awards/categories?error=missing_fields',
    )
  }

  const { userId } = await requirePermission(
    'awards.manage',
    '/admin/awards/categories',
    'award_edition',
    awardEditionId,
  )

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
      `/admin/awards/categories?error=${encodeURIComponent(
        error?.code || 'create_failed',
      )}`,
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
  redirect(
    '/admin/awards/categories?created=1',
  )
}

export async function updateCategory(
  formData: FormData,
) {
  const categoryId = text(
    formData,
    'category_id',
  )
  const name = text(formData, 'name')
  const description = text(
    formData,
    'description',
  )
  const sortOrder = integer(
    formData,
    'sort_order',
  )
  const isPublic =
    formData.get('is_public') === 'on'
  const isActive =
    formData.get('is_active') === 'on'

  if (!categoryId || !name) {
    redirect(
      '/admin/awards/categories?error=missing_fields',
    )
  }

  const oldData =
    await loadCategoryForScope(categoryId)

  const { userId } = await requirePermission(
    'awards.manage',
    '/admin/awards/categories',
    'award_edition',
    oldData.award_edition_id,
  )

  const admin = createAdminClient()
  const { data: newData, error } =
    await admin
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
      .eq(
        'award_edition_id',
        oldData.award_edition_id,
      )
      .select()
      .single()

  if (error || !newData) {
    console.error('updateCategory', error)
    redirect(
      `/admin/awards/categories?error=${encodeURIComponent(
        error?.code || 'update_failed',
      )}`,
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
  redirect(
    '/admin/awards/categories?updated=1',
  )
}

export async function createNominee(
  formData: FormData,
) {
  const awardEditionId = text(
    formData,
    'award_edition_id',
  )
  const categoryId = text(
    formData,
    'category_id',
  )
  const nomineeCode = text(
    formData,
    'nominee_code',
  ).toUpperCase()
  const fullName = text(
    formData,
    'full_name',
  )
  const institution = text(
    formData,
    'institution',
  )
  const bio = text(formData, 'bio')
  const photoUrl = text(
    formData,
    'photo_url',
  )
  const status =
    text(formData, 'status') || 'draft'
  const sortOrder = integer(
    formData,
    'sort_order',
  )
  const isPublic =
    formData.get('is_public') === 'on'

  if (
    !awardEditionId ||
    !categoryId ||
    !nomineeCode ||
    !fullName
  ) {
    redirect(
      '/admin/awards/nominees?error=missing_fields',
    )
  }

  if (!nomineeStatuses.has(status)) {
    redirect(
      '/admin/awards/nominees?error=invalid_status',
    )
  }

  const { userId } = await requirePermission(
    'awards.manage',
    '/admin/awards/nominees',
    'award_edition',
    awardEditionId,
  )

  const admin = createAdminClient()

  const { data: category } = await admin
    .from('award_categories')
    .select('id,award_edition_id')
    .eq('id', categoryId)
    .maybeSingle()

  if (
    !category ||
    category.award_edition_id !==
      awardEditionId
  ) {
    redirect(
      '/admin/awards/nominees?error=category_mismatch',
    )
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
      is_public:
        status === 'published'
          ? isPublic
          : false,
      sort_order: sortOrder,
      created_by: userId,
    })
    .select()
    .single()

  if (error || !data) {
    console.error('createNominee', error)
    redirect(
      `/admin/awards/nominees?error=${encodeURIComponent(
        error?.code || 'create_failed',
      )}`,
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
  redirect(
    '/admin/awards/nominees?created=1',
  )
}

export async function updateNominee(
  formData: FormData,
) {
  const nomineeId = text(
    formData,
    'nominee_id',
  )
  const categoryId = text(
    formData,
    'category_id',
  )
  const nomineeCode = text(
    formData,
    'nominee_code',
  ).toUpperCase()
  const fullName = text(
    formData,
    'full_name',
  )
  const institution = text(
    formData,
    'institution',
  )
  const bio = text(formData, 'bio')
  const photoUrl = text(
    formData,
    'photo_url',
  )
  const status = text(formData, 'status')
  const sortOrder = integer(
    formData,
    'sort_order',
  )
  const isPublic =
    formData.get('is_public') === 'on'

  if (
    !nomineeId ||
    !categoryId ||
    !nomineeCode ||
    !fullName
  ) {
    redirect(
      '/admin/awards/nominees?error=missing_fields',
    )
  }

  if (!nomineeStatuses.has(status)) {
    redirect(
      '/admin/awards/nominees?error=invalid_status',
    )
  }

  const oldData =
    await loadNomineeForScope(nomineeId)

  const { userId } = await requirePermission(
    'awards.manage',
    '/admin/awards/nominees',
    'award_edition',
    oldData.award_edition_id,
  )

  const admin = createAdminClient()

  const { data: category } = await admin
    .from('award_categories')
    .select('id,award_edition_id')
    .eq('id', categoryId)
    .maybeSingle()

  if (
    !category ||
    category.award_edition_id !==
      oldData.award_edition_id
  ) {
    redirect(
      '/admin/awards/nominees?error=category_mismatch',
    )
  }

  const { data: newData, error } =
    await admin
      .from('nominees')
      .update({
        category_id: categoryId,
        nominee_code: nomineeCode,
        full_name: fullName,
        institution: institution || null,
        bio: bio || null,
        photo_url: photoUrl || null,
        status,
        is_public:
          status === 'published'
            ? isPublic
            : false,
        sort_order: sortOrder,
      })
      .eq('id', nomineeId)
      .eq(
        'award_edition_id',
        oldData.award_edition_id,
      )
      .select()
      .single()

  if (error || !newData) {
    console.error('updateNominee', error)
    redirect(
      `/admin/awards/nominees?error=${encodeURIComponent(
        error?.code || 'update_failed',
      )}`,
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
  revalidatePath(
    `/nominees/${newData.nominee_code}`,
  )
  redirect(
    '/admin/awards/nominees?updated=1',
  )
}

export async function changeNomineeStatus(
  formData: FormData,
) {
  const nomineeId = text(
    formData,
    'nominee_id',
  )
  const status = text(formData, 'status')

  if (
    !nomineeId ||
    !nomineeStatuses.has(status)
  ) {
    redirect(
      '/admin/awards/nominees?error=invalid_status',
    )
  }

  const oldData =
    await loadNomineeForScope(nomineeId)

  const { userId } = await requirePermission(
    'awards.manage',
    '/admin/awards/nominees',
    'award_edition',
    oldData.award_edition_id,
  )

  const admin = createAdminClient()

  const { data: newData, error } =
    await admin
      .from('nominees')
      .update({
        status,
        is_public:
          status === 'published',
      })
      .eq('id', nomineeId)
      .eq(
        'award_edition_id',
        oldData.award_edition_id,
      )
      .select()
      .single()

  if (error || !newData) {
    redirect(
      '/admin/awards/nominees?error=status_update_failed',
    )
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
  revalidatePath(
    `/nominees/${newData.nominee_code}`,
  )
  redirect(
    '/admin/awards/nominees?updated=1',
  )
}
