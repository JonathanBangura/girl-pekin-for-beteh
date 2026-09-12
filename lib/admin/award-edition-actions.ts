'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requirePermission } from '@/lib/auth/guards'
import { createAdminClient } from '@/lib/supabase/admin'

const awardStatuses = new Set(['draft', 'published', 'archived'])
const editableEditionStatuses = new Set([
  'draft',
  'published',
  'nominations_open',
  'review',
  'voting_open',
  'voting_closed',
  'archived',
])
const resultManagedStatuses = new Set(['results_review', 'results_published'])
const leaderboardStates = new Set(['hidden', 'visible', 'frozen'])

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim()
}

function optionalInteger(formData: FormData, key: string) {
  const value = text(formData, key)
  if (!value) return null
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : undefined
}

function slugify(value: string) {
  return value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function timestamp(formData: FormData, key: string) {
  const raw = text(formData, key)
  if (!raw) return null

  const normalized = /(?:Z|[+-]\d{2}:\d{2})$/i.test(raw)
    ? raw
    : `${raw}${raw.length === 16 ? ':00' : ''}Z`

  const value = new Date(normalized)
  if (Number.isNaN(value.getTime())) return undefined
  return value.toISOString()
}

function refreshAwardWorkspace() {
  revalidatePath('/admin')
  revalidatePath('/admin/awards')
  revalidatePath('/admin/awards/editions')
  revalidatePath('/admin/awards/categories')
  revalidatePath('/admin/awards/nominees')
  revalidatePath('/admin/awards/voting')
  revalidatePath('/awards')
  revalidatePath('/nominees')
  revalidatePath('/events')
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
  const { error } = await admin.from('audit_logs').insert({
    actor_user_id: actorUserId,
    action,
    entity_type: entityType,
    entity_id: entityId ?? null,
    old_data: oldData ?? null,
    new_data: newData ?? null,
    metadata: {},
  })

  if (error) console.error('award/edition audit log insert failed', error)
}

export async function createAward(formData: FormData) {
  const { userId } = await requirePermission('awards.manage', '/admin/awards')

  const name = text(formData, 'name')
  const requestedSlug = text(formData, 'slug')
  const summary = text(formData, 'summary')
  const description = text(formData, 'description')
  const status = text(formData, 'status') || 'draft'

  if (!name) redirect('/admin/awards?error=missing_fields')
  if (!awardStatuses.has(status)) redirect('/admin/awards?error=invalid_status')

  const slug = slugify(requestedSlug || name)
  if (!slug) redirect('/admin/awards?error=invalid_slug')

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('awards')
    .insert({
      name,
      slug,
      summary: summary || null,
      description: description || null,
      status,
      created_by: userId,
    })
    .select()
    .single()

  if (error || !data) {
    console.error('createAward', error)
    redirect(`/admin/awards?error=${encodeURIComponent(error?.code || 'create_failed')}`)
  }

  await audit({
    admin,
    actorUserId: userId,
    action: 'award_created',
    entityType: 'award',
    entityId: data.id,
    newData: data,
  })

  refreshAwardWorkspace()
  redirect('/admin/awards?created=1')
}

export async function updateAward(formData: FormData) {
  const { userId } = await requirePermission('awards.manage', '/admin/awards')

  const awardId = text(formData, 'award_id')
  const name = text(formData, 'name')
  const requestedSlug = text(formData, 'slug')
  const summary = text(formData, 'summary')
  const description = text(formData, 'description')
  const status = text(formData, 'status')

  if (!awardId || !name) redirect('/admin/awards?error=missing_fields')
  if (!awardStatuses.has(status)) redirect('/admin/awards?error=invalid_status')

  const slug = slugify(requestedSlug || name)
  if (!slug) redirect('/admin/awards?error=invalid_slug')

  const admin = createAdminClient()
  const { data: oldData } = await admin
    .from('awards')
    .select('*')
    .eq('id', awardId)
    .maybeSingle()

  if (!oldData) redirect('/admin/awards?error=not_found')

  if (status === 'archived') {
    const { count } = await admin
      .from('award_editions')
      .select('id', { count: 'exact', head: true })
      .eq('award_id', awardId)
      .neq('status', 'archived')

    if ((count ?? 0) > 0) redirect('/admin/awards?error=active_editions')
  }

  const { data: newData, error } = await admin
    .from('awards')
    .update({
      name,
      slug,
      summary: summary || null,
      description: description || null,
      status,
    })
    .eq('id', awardId)
    .select()
    .single()

  if (error || !newData) {
    console.error('updateAward', error)
    redirect(`/admin/awards?error=${encodeURIComponent(error?.code || 'update_failed')}`)
  }

  await audit({
    admin,
    actorUserId: userId,
    action: 'award_updated',
    entityType: 'award',
    entityId: awardId,
    oldData,
    newData,
  })

  refreshAwardWorkspace()
  redirect('/admin/awards?updated=1')
}

async function validateCeremonyEvent({
  admin,
  ceremonyEventId,
  editionId,
}: {
  admin: ReturnType<typeof createAdminClient>
  ceremonyEventId: string | null
  editionId: string
}) {
  if (!ceremonyEventId) return null

  const { data: event, error } = await admin
    .from('events')
    .select('id,award_edition_id,title,slug,status')
    .eq('id', ceremonyEventId)
    .maybeSingle()

  if (error || !event) return { error: 'event_not_found' as const }

  if (event.award_edition_id && event.award_edition_id !== editionId) {
    return { error: 'event_in_use' as const }
  }

  if (event.award_edition_id !== editionId) {
    const { error: linkError } = await admin
      .from('events')
      .update({ award_edition_id: editionId })
      .eq('id', ceremonyEventId)

    if (linkError) {
      console.error('link ceremony event', linkError)
      return { error: 'event_link_failed' as const }
    }
  }

  return { event }
}

function validateEditionWindow({
  status,
  startsAt,
  endsAt,
}: {
  status: string
  startsAt: string | null | undefined
  endsAt: string | null | undefined
}) {
  if (startsAt === undefined || endsAt === undefined) {
    redirect('/admin/awards/editions?error=invalid_datetime')
  }

  if (startsAt && endsAt && new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
    redirect('/admin/awards/editions?error=invalid_voting_window')
  }

  if (status === 'voting_open' && (!startsAt || !endsAt)) {
    redirect('/admin/awards/editions?error=voting_window_required')
  }
}

export async function createAwardEdition(formData: FormData) {
  const { userId } = await requirePermission(
    'awards.manage',
    '/admin/awards/editions',
  )

  const awardId = text(formData, 'award_id')
  const year = optionalInteger(formData, 'year')
  const editionNumber = optionalInteger(formData, 'edition_number')
  const editionLabel = text(formData, 'edition_label')
  const theme = text(formData, 'theme')
  const description = text(formData, 'description')
  const status = text(formData, 'status') || 'draft'
  const isPublic = formData.get('is_public') === 'on'
  const votingStartsAt = timestamp(formData, 'voting_starts_at')
  const votingEndsAt = timestamp(formData, 'voting_ends_at')
  const leaderboardVisibility = text(formData, 'leaderboard_visibility') || 'hidden'
  const ceremonyEventId = text(formData, 'ceremony_event_id') || null

  if (!awardId || !year || !editionLabel || editionNumber === undefined) {
    redirect('/admin/awards/editions?error=missing_fields')
  }
  if (!editableEditionStatuses.has(status)) {
    redirect('/admin/awards/editions?error=invalid_status')
  }
  if (!leaderboardStates.has(leaderboardVisibility)) {
    redirect('/admin/awards/editions?error=invalid_leaderboard_state')
  }
  if (status === 'voting_open' && !isPublic) {
    redirect('/admin/awards/editions?error=voting_requires_public')
  }

  validateEditionWindow({ status, startsAt: votingStartsAt, endsAt: votingEndsAt })

  const admin = createAdminClient()
  const { data: award } = await admin
    .from('awards')
    .select('id,status')
    .eq('id', awardId)
    .maybeSingle()

  if (!award || award.status === 'archived') {
    redirect('/admin/awards/editions?error=award_unavailable')
  }

  const { data: edition, error } = await admin
    .from('award_editions')
    .insert({
      award_id: awardId,
      year,
      edition_number: editionNumber,
      edition_label: editionLabel,
      theme: theme || null,
      description: description || null,
      status,
      is_public: isPublic,
      voting_starts_at: votingStartsAt,
      voting_ends_at: votingEndsAt,
      leaderboard_visibility: leaderboardVisibility,
      leaderboard_frozen_at:
        leaderboardVisibility === 'frozen' ? new Date().toISOString() : null,
      created_by: userId,
    })
    .select()
    .single()

  if (error || !edition) {
    console.error('createAwardEdition', error)
    redirect(
      `/admin/awards/editions?error=${encodeURIComponent(error?.code || 'create_failed')}`,
    )
  }

  let newData = edition

  if (ceremonyEventId) {
    const linked = await validateCeremonyEvent({ admin, ceremonyEventId, editionId: edition.id })
    if (linked?.error) {
      redirect(`/admin/awards/editions?created=1&error=${linked.error}`)
    }

    const { data: updated, error: ceremonyError } = await admin
      .from('award_editions')
      .update({ ceremony_event_id: ceremonyEventId })
      .eq('id', edition.id)
      .select()
      .single()

    if (ceremonyError || !updated) {
      console.error('createAwardEdition ceremony link', ceremonyError)
      redirect('/admin/awards/editions?created=1&error=ceremony_link_failed')
    }

    newData = updated
  }

  await audit({
    admin,
    actorUserId: userId,
    action: 'award_edition_created',
    entityType: 'award_edition',
    entityId: edition.id,
    newData,
  })

  refreshAwardWorkspace()
  redirect('/admin/awards/editions?created=1')
}

export async function updateAwardEdition(formData: FormData) {
  const { userId } = await requirePermission(
    'awards.manage',
    '/admin/awards/editions',
  )

  const editionId = text(formData, 'edition_id')
  const awardId = text(formData, 'award_id')
  const year = optionalInteger(formData, 'year')
  const editionNumber = optionalInteger(formData, 'edition_number')
  const editionLabel = text(formData, 'edition_label')
  const theme = text(formData, 'theme')
  const description = text(formData, 'description')
  const requestedStatus = text(formData, 'status')
  const isPublic = formData.get('is_public') === 'on'
  const votingStartsAt = timestamp(formData, 'voting_starts_at')
  const votingEndsAt = timestamp(formData, 'voting_ends_at')
  const leaderboardVisibility = text(formData, 'leaderboard_visibility') || 'hidden'
  const ceremonyEventId = text(formData, 'ceremony_event_id') || null

  if (!editionId || !awardId || !year || !editionLabel || editionNumber === undefined) {
    redirect('/admin/awards/editions?error=missing_fields')
  }
  if (!leaderboardStates.has(leaderboardVisibility)) {
    redirect('/admin/awards/editions?error=invalid_leaderboard_state')
  }

  const admin = createAdminClient()
  const { data: oldData } = await admin
    .from('award_editions')
    .select('*')
    .eq('id', editionId)
    .maybeSingle()

  if (!oldData) redirect('/admin/awards/editions?error=not_found')

  let status = requestedStatus
  if (resultManagedStatuses.has(oldData.status)) {
    status = oldData.status
  } else if (!editableEditionStatuses.has(status)) {
    redirect('/admin/awards/editions?error=invalid_status')
  }

  if (status === 'voting_open' && !isPublic) {
    redirect('/admin/awards/editions?error=voting_requires_public')
  }

  validateEditionWindow({ status, startsAt: votingStartsAt, endsAt: votingEndsAt })

  const { data: award } = await admin
    .from('awards')
    .select('id,status')
    .eq('id', awardId)
    .maybeSingle()

  if (!award || award.status === 'archived') {
    redirect('/admin/awards/editions?error=award_unavailable')
  }

  if (ceremonyEventId) {
    const linked = await validateCeremonyEvent({ admin, ceremonyEventId, editionId })
    if (linked?.error) {
      redirect(`/admin/awards/editions?error=${linked.error}`)
    }
  }

  const wasFrozen = oldData.leaderboard_visibility === 'frozen'
  const willBeFrozen = leaderboardVisibility === 'frozen'

  const { data: newData, error } = await admin
    .from('award_editions')
    .update({
      award_id: awardId,
      year,
      edition_number: editionNumber,
      edition_label: editionLabel,
      theme: theme || null,
      description: description || null,
      status,
      is_public: isPublic,
      voting_starts_at: votingStartsAt,
      voting_ends_at: votingEndsAt,
      leaderboard_visibility: leaderboardVisibility,
      leaderboard_frozen_at: willBeFrozen
        ? wasFrozen && oldData.leaderboard_frozen_at
          ? oldData.leaderboard_frozen_at
          : new Date().toISOString()
        : null,
      ceremony_event_id: ceremonyEventId,
    })
    .eq('id', editionId)
    .select()
    .single()

  if (error || !newData) {
    console.error('updateAwardEdition', error)
    redirect(
      `/admin/awards/editions?error=${encodeURIComponent(error?.code || 'update_failed')}`,
    )
  }

  await audit({
    admin,
    actorUserId: userId,
    action: 'award_edition_updated',
    entityType: 'award_edition',
    entityId: editionId,
    oldData,
    newData,
  })

  refreshAwardWorkspace()
  redirect('/admin/awards/editions?updated=1')
}
