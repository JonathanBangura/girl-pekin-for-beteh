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

  const { error } = await admin.from('award_categories').insert({
    award_edition_id: awardEditionId,
    slug: slugify(name),
    name,
    description: description || null,
    is_public: isPublic,
    is_active: isActive,
    sort_order: sortOrder,
    created_by: userId,
  })

  if (error) {
    console.error('createCategory', error)
    redirect(
      `/admin/awards/categories?error=${encodeURIComponent(error.code || 'create_failed')}`,
    )
  }

  revalidatePath('/admin')
  revalidatePath('/admin/awards')
  revalidatePath('/admin/awards/categories')
  revalidatePath('/admin/awards/nominees')
  redirect('/admin/awards/categories?created=1')
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
  const status = text(formData, 'status') || 'draft'
  const isPublic = formData.get('is_public') === 'on'

  if (!awardEditionId || !categoryId || !nomineeCode || !fullName) {
    redirect('/admin/awards/nominees?error=missing_fields')
  }

  const allowedStatuses = new Set([
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

  if (!allowedStatuses.has(status)) {
    redirect('/admin/awards/nominees?error=invalid_status')
  }

  const admin = createAdminClient()

  const { data: category, error: categoryError } = await admin
    .from('award_categories')
    .select('id, award_edition_id')
    .eq('id', categoryId)
    .maybeSingle()

  if (
    categoryError ||
    !category ||
    category.award_edition_id !== awardEditionId
  ) {
    redirect('/admin/awards/nominees?error=category_mismatch')
  }

  const { error } = await admin.from('nominees').insert({
    award_edition_id: awardEditionId,
    category_id: categoryId,
    nominee_code: nomineeCode,
    full_name: fullName,
    institution: institution || null,
    bio: bio || null,
    status,
    is_public: status === 'published' ? isPublic : false,
    created_by: userId,
  })

  if (error) {
    console.error('createNominee', error)
    redirect(
      `/admin/awards/nominees?error=${encodeURIComponent(error.code || 'create_failed')}`,
    )
  }

  revalidatePath('/admin')
  revalidatePath('/admin/awards')
  revalidatePath('/admin/awards/categories')
  revalidatePath('/admin/awards/nominees')
  redirect('/admin/awards/nominees?created=1')
}
