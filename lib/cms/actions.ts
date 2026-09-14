'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  requireContentManager,
  requireProgramsManager,
} from '@/lib/cms/data'

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim()
}

function intValue(
  formData: FormData,
  key: string,
  fallback = 0,
) {
  const parsed = Number.parseInt(text(formData, key), 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)
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
    console.error('cms audit', error)
  }
}

const imageTypes = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
])

async function uploadImage(
  admin: ReturnType<typeof createAdminClient>,
  file: File | null,
  folder: string,
) {
  if (!file || file.size <= 0) return null

  if (
    file.size > 5 * 1024 * 1024 ||
    !imageTypes.has(file.type)
  ) {
    throw new Error('invalid_image')
  }

  const extension =
    file.type === 'image/png'
      ? 'png'
      : file.type === 'image/webp'
        ? 'webp'
        : 'jpg'

  const path = `${folder}/${randomUUID()}.${extension}`
  const bytes = Buffer.from(await file.arrayBuffer())

  const { error } = await admin.storage
    .from('public-site-media')
    .upload(path, bytes, {
      contentType: file.type,
      upsert: false,
    })

  if (error) {
    console.error('cms image upload', error)
    throw new Error('image_upload_failed')
  }

  const { data } = admin.storage
    .from('public-site-media')
    .getPublicUrl(path)

  return data.publicUrl
}

function refreshPublic() {
  revalidatePath('/')
  revalidatePath('/about')
  revalidatePath('/programs')
  revalidatePath('/news')
  revalidatePath('/gallery')
  revalidatePath('/partners')
  revalidatePath('/contact')
  revalidatePath('/admin/content')
  revalidatePath('/admin/programs')
}

export async function saveSitePage(
  formData: FormData,
) {
  const { userId } = await requireContentManager()
  const pageKey = text(formData, 'page_key')

  if (!['home', 'about', 'contact'].includes(pageKey)) {
    redirect('/admin/content?error=invalid_page')
  }

  const admin = createAdminClient()
  const isPublished =
    formData.get('is_published') === 'on'

  const { data: oldData } = await admin
    .from('site_pages')
    .select('*')
    .eq('page_key', pageKey)
    .maybeSingle()

  const payload = {
    page_key: pageKey,
    eyebrow: text(formData, 'eyebrow') || null,
    title: text(formData, 'title') || null,
    summary: text(formData, 'summary') || null,
    body: text(formData, 'body') || null,
    secondary_body:
      text(formData, 'secondary_body') || null,
    cta_label: text(formData, 'cta_label') || null,
    cta_href: text(formData, 'cta_href') || null,
    is_published: isPublished,
    published_at: isPublished
      ? oldData?.published_at ??
        new Date().toISOString()
      : null,
    updated_by: userId,
  }

  const { data, error } = await admin
    .from('site_pages')
    .upsert(
      {
        ...payload,
        created_by: oldData?.created_by ?? userId,
      },
      {
        onConflict: 'page_key',
      },
    )
    .select()
    .single()

  if (error || !data) {
    console.error('saveSitePage', error)
    redirect('/admin/content?error=page_save_failed')
  }

  await audit({
    admin,
    actorUserId: userId,
    action: 'site_page_saved',
    entityType: 'site_page',
    entityId: data.id,
    oldData,
    newData: data,
  })

  refreshPublic()
  redirect('/admin/content?page_saved=1')
}

export async function saveSiteSettings(
  formData: FormData,
) {
  const { userId } = await requireContentManager()
  const admin = createAdminClient()

  const { data: oldData } = await admin
    .from('site_settings')
    .select('*')
    .eq('singleton', true)
    .maybeSingle()

  const { data, error } = await admin
    .from('site_settings')
    .upsert(
      {
        singleton: true,
        contact_email:
          text(formData, 'contact_email') || null,
        contact_phone:
          text(formData, 'contact_phone') || null,
        contact_address:
          text(formData, 'contact_address') || null,
        instagram_url:
          text(formData, 'instagram_url') || null,
        facebook_url:
          text(formData, 'facebook_url') || null,
        x_url: text(formData, 'x_url') || null,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'singleton',
      },
    )
    .select()
    .single()

  if (error || !data) {
    console.error('saveSiteSettings', error)
    redirect('/admin/content?error=settings_save_failed')
  }

  await audit({
    admin,
    actorUserId: userId,
    action: 'site_settings_saved',
    entityType: 'site_settings',
    entityId: null,
    oldData,
    newData: data,
  })

  refreshPublic()
  redirect('/admin/content?settings_saved=1')
}

export async function saveNewsPost(
  formData: FormData,
) {
  const { userId } = await requireContentManager()
  const admin = createAdminClient()

  const id = text(formData, 'id')
  const title = text(formData, 'title')
  const requestedSlug = text(formData, 'slug')
  const status = text(formData, 'status') || 'draft'
  const image = formData.get('cover_image')

  if (
    !title ||
    !['draft', 'published', 'archived'].includes(status)
  ) {
    redirect('/admin/content?error=invalid_news')
  }

  let oldData: any = null

  if (id) {
    const result = await admin
      .from('news_posts')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    oldData = result.data ?? null
  }

  let coverImageUrl =
    text(formData, 'existing_cover_image_url') || null

  try {
    if (image instanceof File && image.size > 0) {
      coverImageUrl = await uploadImage(
        admin,
        image,
        'news',
      )
    }
  } catch (error) {
    redirect(
      `/admin/content?error=${
        error instanceof Error
          ? error.message
          : 'image_upload_failed'
      }`,
    )
  }

  const payload = {
    slug: slugify(requestedSlug || title),
    title,
    excerpt: text(formData, 'excerpt') || null,
    body: text(formData, 'body') || null,
    cover_image_url: coverImageUrl,
    status,
    published_at:
      status === 'published'
        ? oldData?.published_at ??
          new Date().toISOString()
        : null,
    sort_order: intValue(formData, 'sort_order', 0),
    updated_by: userId,
  }

  const query = id
    ? admin
        .from('news_posts')
        .update(payload)
        .eq('id', id)
    : admin.from('news_posts').insert({
        ...payload,
        created_by: userId,
      })

  const { data, error } = await query
    .select()
    .single()

  if (error || !data) {
    console.error('saveNewsPost', error)
    redirect(
      `/admin/content?error=${encodeURIComponent(
        error?.code || 'news_save_failed',
      )}`,
    )
  }

  await audit({
    admin,
    actorUserId: userId,
    action: id
      ? 'news_post_updated'
      : 'news_post_created',
    entityType: 'news_post',
    entityId: data.id,
    oldData,
    newData: data,
  })

  refreshPublic()
  revalidatePath(`/news/${data.slug}`)
  redirect('/admin/content?news_saved=1')
}

export async function saveGalleryItem(
  formData: FormData,
) {
  const { userId } = await requireContentManager()
  const admin = createAdminClient()

  const id = text(formData, 'id')
  const title = text(formData, 'title')
  const status = text(formData, 'status') || 'draft'
  const image = formData.get('image')

  if (
    !title ||
    !['draft', 'published', 'archived'].includes(status)
  ) {
    redirect('/admin/content?error=invalid_gallery')
  }

  let oldData: any = null

  if (id) {
    const result = await admin
      .from('gallery_items')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    oldData = result.data ?? null
  }

  let imageUrl =
    text(formData, 'existing_image_url') || null

  try {
    if (image instanceof File && image.size > 0) {
      imageUrl = await uploadImage(
        admin,
        image,
        'gallery',
      )
    }
  } catch (error) {
    redirect(
      `/admin/content?error=${
        error instanceof Error
          ? error.message
          : 'image_upload_failed'
      }`,
    )
  }

  if (!imageUrl) {
    redirect('/admin/content?error=gallery_image_required')
  }

  const payload = {
    title,
    caption: text(formData, 'caption') || null,
    image_url: imageUrl,
    status,
    published_at:
      status === 'published'
        ? oldData?.published_at ??
          new Date().toISOString()
        : null,
    sort_order: intValue(formData, 'sort_order', 0),
    updated_by: userId,
  }

  const query = id
    ? admin
        .from('gallery_items')
        .update(payload)
        .eq('id', id)
    : admin.from('gallery_items').insert({
        ...payload,
        created_by: userId,
      })

  const { data, error } = await query
    .select()
    .single()

  if (error || !data) {
    console.error('saveGalleryItem', error)
    redirect('/admin/content?error=gallery_save_failed')
  }

  await audit({
    admin,
    actorUserId: userId,
    action: id
      ? 'gallery_item_updated'
      : 'gallery_item_created',
    entityType: 'gallery_item',
    entityId: data.id,
    oldData,
    newData: data,
  })

  refreshPublic()
  redirect('/admin/content?gallery_saved=1')
}

export async function savePartner(
  formData: FormData,
) {
  const { userId } = await requireContentManager()
  const admin = createAdminClient()

  const id = text(formData, 'id')
  const name = text(formData, 'name')
  const status = text(formData, 'status') || 'draft'
  const image = formData.get('logo')

  if (
    !name ||
    !['draft', 'published', 'archived'].includes(status)
  ) {
    redirect('/admin/content?error=invalid_partner')
  }

  let oldData: any = null

  if (id) {
    const result = await admin
      .from('partners')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    oldData = result.data ?? null
  }

  let logoUrl =
    text(formData, 'existing_logo_url') || null

  try {
    if (image instanceof File && image.size > 0) {
      logoUrl = await uploadImage(
        admin,
        image,
        'partners',
      )
    }
  } catch (error) {
    redirect(
      `/admin/content?error=${
        error instanceof Error
          ? error.message
          : 'image_upload_failed'
      }`,
    )
  }

  const payload = {
    name,
    partner_type:
      text(formData, 'partner_type') || null,
    description:
      text(formData, 'description') || null,
    logo_url: logoUrl,
    website_url:
      text(formData, 'website_url') || null,
    status,
    sort_order: intValue(formData, 'sort_order', 0),
    updated_by: userId,
  }

  const query = id
    ? admin
        .from('partners')
        .update(payload)
        .eq('id', id)
    : admin.from('partners').insert({
        ...payload,
        created_by: userId,
      })

  const { data, error } = await query
    .select()
    .single()

  if (error || !data) {
    console.error('savePartner', error)
    redirect('/admin/content?error=partner_save_failed')
  }

  await audit({
    admin,
    actorUserId: userId,
    action: id
      ? 'partner_updated'
      : 'partner_created',
    entityType: 'partner',
    entityId: data.id,
    oldData,
    newData: data,
  })

  refreshPublic()
  redirect('/admin/content?partner_saved=1')
}

export async function updateContactSubmission(
  formData: FormData,
) {
  const { userId } = await requireContentManager()
  const admin = createAdminClient()

  const id = text(formData, 'id')
  const status = text(formData, 'status')

  if (
    !id ||
    !['new', 'read', 'replied', 'closed'].includes(
      status,
    )
  ) {
    redirect('/admin/content?error=invalid_contact_status')
  }

  const { data: oldData } = await admin
    .from('contact_submissions')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (!oldData) {
    redirect('/admin/content?error=contact_not_found')
  }

  const { data, error } = await admin
    .from('contact_submissions')
    .update({
      status,
      handled_by: userId,
      handled_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error || !data) {
    console.error('updateContactSubmission', error)
    redirect('/admin/content?error=contact_update_failed')
  }

  await audit({
    admin,
    actorUserId: userId,
    action: 'contact_submission_status_changed',
    entityType: 'contact_submission',
    entityId: id,
    oldData: {
      status: oldData.status,
    },
    newData: {
      status: data.status,
    },
  })

  revalidatePath('/admin/content')
  redirect('/admin/content?contact_updated=1')
}

export async function saveProgram(
  formData: FormData,
) {
  const { userId } = await requireProgramsManager()
  const admin = createAdminClient()

  const id = text(formData, 'id')
  const title = text(formData, 'title')
  const requestedSlug = text(formData, 'slug')
  const status = text(formData, 'status') || 'draft'
  const image = formData.get('cover_image')

  if (
    !title ||
    !['draft', 'published', 'archived'].includes(status)
  ) {
    redirect('/admin/programs?error=invalid_program')
  }

  let oldData: any = null

  if (id) {
    const result = await admin
      .from('programs')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    oldData = result.data ?? null
  }

  let coverImageUrl =
    text(formData, 'existing_cover_image_url') || null

  try {
    if (image instanceof File && image.size > 0) {
      coverImageUrl = await uploadImage(
        admin,
        image,
        'programs',
      )
    }
  } catch (error) {
    redirect(
      `/admin/programs?error=${
        error instanceof Error
          ? error.message
          : 'image_upload_failed'
      }`,
    )
  }

  const payload = {
    slug: slugify(requestedSlug || title),
    title,
    summary: text(formData, 'summary') || null,
    body: text(formData, 'body') || null,
    cover_image_url: coverImageUrl,
    status,
    published_at:
      status === 'published'
        ? oldData?.published_at ??
          new Date().toISOString()
        : null,
    sort_order: intValue(formData, 'sort_order', 0),
  }

  const query = id
    ? admin
        .from('programs')
        .update(payload)
        .eq('id', id)
    : admin.from('programs').insert({
        ...payload,
        created_by: userId,
      })

  const { data, error } = await query
    .select()
    .single()

  if (error || !data) {
    console.error('saveProgram', error)
    redirect(
      `/admin/programs?error=${encodeURIComponent(
        error?.code || 'program_save_failed',
      )}`,
    )
  }

  await audit({
    admin,
    actorUserId: userId,
    action: id
      ? 'program_updated'
      : 'program_created',
    entityType: 'program',
    entityId: data.id,
    oldData,
    newData: data,
  })

  refreshPublic()
  revalidatePath(`/programs/${data.slug}`)
  redirect('/admin/programs?saved=1')
}
