'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requirePermission } from '@/lib/auth/guards'
import { createAdminClient } from '@/lib/supabase/admin'

const accessTypes = new Set([
  'free_registration',
  'paid',
  'invitation_only',
  'open',
])

const eventStatuses = new Set([
  'draft',
  'published',
  'sales_closed',
  'completed',
  'cancelled',
  'archived',
])

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim()
}

function slugify(value: string) {
  return value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function optionalInteger(
  formData: FormData,
  key: string,
) {
  const raw = text(formData, key)
  if (!raw) return null

  const value =
    Number.parseInt(raw, 10)

  return Number.isInteger(value)
    ? value
    : undefined
}

function timestamp(
  formData: FormData,
  key: string,
) {
  const raw = text(formData, key)
  if (!raw) return null

  const normalized =
    /(?:Z|[+-]\d{2}:\d{2})$/i.test(raw)
      ? raw
      : `${raw}${
          raw.length === 16 ? ':00' : ''
        }Z`

  const value = new Date(normalized)

  return Number.isNaN(value.getTime())
    ? undefined
    : value.toISOString()
}

function refreshEventWorkspace(
  oldSlug?: string | null,
  newSlug?: string | null,
) {
  revalidatePath('/admin')
  revalidatePath('/admin/events')
  revalidatePath(
    '/admin/events/ticket-types',
  )
  revalidatePath(
    '/admin/events/orders',
  )
  revalidatePath(
    '/admin/events/tickets',
  )
  revalidatePath(
    '/admin/events/checkins',
  )
  revalidatePath('/events')
  revalidatePath('/awards')

  for (const slug of new Set(
    [oldSlug, newSlug].filter(
      Boolean,
    ) as string[],
  )) {
    revalidatePath(
      `/events/${slug}`,
    )
    revalidatePath(
      `/events/${slug}/tickets`,
    )
  }
}

export async function saveEvent(
  formData: FormData,
) {
  const eventId = text(
    formData,
    'event_id',
  )
  const title = text(formData, 'title')
  const requestedSlug = text(
    formData,
    'slug',
  )
  const summary = text(
    formData,
    'summary',
  )
  const description = text(
    formData,
    'description',
  )
  const venue = text(
    formData,
    'venue',
  )
  const startsAt = timestamp(
    formData,
    'starts_at',
  )
  const endsAt = timestamp(
    formData,
    'ends_at',
  )
  const accessType =
    text(formData, 'access_type') ||
    'open'
  const status =
    text(formData, 'status') ||
    'draft'
  const isPublic =
    formData.get('is_public') === 'on'
  const capacity = optionalInteger(
    formData,
    'capacity',
  )
  const coverImageUrl = text(
    formData,
    'cover_image_url',
  )

  if (!title) {
    redirect(
      '/admin/events?error=missing_title',
    )
  }

  if (
    startsAt === undefined ||
    endsAt === undefined ||
    capacity === undefined
  ) {
    redirect(
      '/admin/events?error=invalid_fields',
    )
  }

  if (
    startsAt &&
    endsAt &&
    new Date(endsAt).getTime() <=
      new Date(startsAt).getTime()
  ) {
    redirect(
      '/admin/events?error=invalid_window',
    )
  }

  if (
    capacity != null &&
    capacity < 0
  ) {
    redirect(
      '/admin/events?error=invalid_capacity',
    )
  }

  if (!accessTypes.has(accessType)) {
    redirect(
      '/admin/events?error=invalid_access',
    )
  }

  if (!eventStatuses.has(status)) {
    redirect(
      '/admin/events?error=invalid_status',
    )
  }

  const slug = slugify(
    requestedSlug || title,
  )

  if (!slug) {
    redirect(
      '/admin/events?error=invalid_slug',
    )
  }

  const admin = createAdminClient()
  let oldData: any = null
  let userId: string

  if (eventId) {
    const result = await admin
      .from('events')
      .select('*')
      .eq('id', eventId)
      .maybeSingle()

    oldData = result.data

    if (!oldData) {
      redirect(
        '/admin/events?error=not_found',
      )
    }

    const auth =
      await requirePermission(
        'events.manage',
        '/admin/events',
        'event',
        eventId,
      )

    userId = auth.userId
  } else {
    const auth =
      await requirePermission(
        'events.manage',
        '/admin/events',
      )

    userId = auth.userId
  }

  const payload = {
    slug,
    title,
    summary: summary || null,
    description:
      description || null,
    venue: venue || null,
    starts_at: startsAt,
    ends_at: endsAt,
    access_type: accessType,
    status,
    is_public: isPublic,
    capacity,
    cover_image_url:
      coverImageUrl || null,
  }

  const result = eventId
    ? await admin
        .from('events')
        .update(payload)
        .eq('id', eventId)
        .select()
        .single()
    : await admin
        .from('events')
        .insert({
          ...payload,
          award_edition_id: null,
          created_by: userId,
        })
        .select()
        .single()

  if (
    result.error ||
    !result.data
  ) {
    console.error(
      'saveEvent',
      result.error,
    )

    redirect(
      `/admin/events?error=${encodeURIComponent(
        result.error?.code ||
          'save_failed',
      )}`,
    )
  }

  const { error: auditError } =
    await admin
      .from('audit_logs')
      .insert({
        actor_user_id: userId,
        action: eventId
          ? 'event_updated'
          : 'event_created',
        entity_type: 'event',
        entity_id: result.data.id,
        old_data: oldData,
        new_data: result.data,
        metadata: {},
      })

  if (auditError) {
    console.error(
      'event audit',
      auditError,
    )
  }

  refreshEventWorkspace(
    oldData?.slug ?? null,
    result.data.slug,
  )

  redirect('/admin/events?saved=1')
}
