'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requirePermission } from '@/lib/auth/guards'
import { createAdminClient } from '@/lib/supabase/admin'

export {
  createAward,
  createAwardEdition,
  updateAward,
} from '@/lib/admin/award-edition-actions'

const editableEditionStatuses = new Set([
  'draft',
  'published',
  'nominations_open',
  'review',
  'voting_open',
  'voting_closed',
  'archived',
])

const resultManagedStatuses = new Set([
  'results_review',
  'results_published',
])

const leaderboardStates = new Set([
  'hidden',
  'visible',
  'frozen',
])

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim()
}

function optionalInteger(
  formData: FormData,
  key: string,
) {
  const value = text(formData, key)
  if (!value) return null

  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed)
    ? parsed
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
  if (Number.isNaN(value.getTime())) {
    return undefined
  }

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

function validateEditionWindow({
  status,
  startsAt,
  endsAt,
}: {
  status: string
  startsAt: string | null | undefined
  endsAt: string | null | undefined
}) {
  if (
    startsAt === undefined ||
    endsAt === undefined
  ) {
    redirect(
      '/admin/awards/editions?error=invalid_datetime',
    )
  }

  if (
    startsAt &&
    endsAt &&
    new Date(endsAt).getTime() <=
      new Date(startsAt).getTime()
  ) {
    redirect(
      '/admin/awards/editions?error=invalid_voting_window',
    )
  }

  if (
    status === 'voting_open' &&
    (!startsAt || !endsAt)
  ) {
    redirect(
      '/admin/awards/editions?error=voting_window_required',
    )
  }
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

  const { data: event, error } =
    await admin
      .from('events')
      .select(
        'id,award_edition_id,title,slug,status',
      )
      .eq('id', ceremonyEventId)
      .maybeSingle()

  if (error || !event) {
    return {
      error: 'event_not_found' as const,
    }
  }

  if (
    event.award_edition_id &&
    event.award_edition_id !== editionId
  ) {
    return {
      error: 'event_in_use' as const,
    }
  }

  if (
    event.award_edition_id !== editionId
  ) {
    const { error: linkError } =
      await admin
        .from('events')
        .update({
          award_edition_id: editionId,
        })
        .eq('id', ceremonyEventId)

    if (linkError) {
      console.error(
        'link ceremony event',
        linkError,
      )
      return {
        error: 'event_link_failed' as const,
      }
    }
  }

  return { event }
}

export async function updateAwardEdition(
  formData: FormData,
) {
  const editionId = text(
    formData,
    'edition_id',
  )
  const awardId = text(formData, 'award_id')
  const year = optionalInteger(
    formData,
    'year',
  )
  const editionNumber = optionalInteger(
    formData,
    'edition_number',
  )
  const editionLabel = text(
    formData,
    'edition_label',
  )
  const theme = text(formData, 'theme')
  const description = text(
    formData,
    'description',
  )
  const requestedStatus = text(
    formData,
    'status',
  )
  const isPublic =
    formData.get('is_public') === 'on'
  const votingStartsAt = timestamp(
    formData,
    'voting_starts_at',
  )
  const votingEndsAt = timestamp(
    formData,
    'voting_ends_at',
  )
  const leaderboardVisibility =
    text(
      formData,
      'leaderboard_visibility',
    ) || 'hidden'
  const ceremonyEventId =
    text(
      formData,
      'ceremony_event_id',
    ) || null

  if (
    !editionId ||
    !awardId ||
    !year ||
    !editionLabel ||
    editionNumber === undefined
  ) {
    redirect(
      '/admin/awards/editions?error=missing_fields',
    )
  }

  if (
    !leaderboardStates.has(
      leaderboardVisibility,
    )
  ) {
    redirect(
      '/admin/awards/editions?error=invalid_leaderboard_state',
    )
  }

  const {
    supabase,
    userId,
  } = await requirePermission(
    'awards.manage',
    '/admin/awards/editions',
    'award_edition',
    editionId,
  )

  const { data: canManageGlobal } =
    await supabase.rpc('has_permission', {
      requested_permission_code:
        'awards.manage',
      requested_scope_type: null,
      requested_scope_id: null,
    })

  const admin = createAdminClient()

  const { data: oldData } = await admin
    .from('award_editions')
    .select('*')
    .eq('id', editionId)
    .maybeSingle()

  if (!oldData) {
    redirect(
      '/admin/awards/editions?error=not_found',
    )
  }

  if (
    canManageGlobal !== true &&
    awardId !== oldData.award_id
  ) {
    redirect(
      '/admin/awards/editions?error=award_scope_change_forbidden',
    )
  }

  let status = requestedStatus

  if (
    resultManagedStatuses.has(
      oldData.status,
    )
  ) {
    status = oldData.status
  } else if (
    !editableEditionStatuses.has(status)
  ) {
    redirect(
      '/admin/awards/editions?error=invalid_status',
    )
  }

  if (
    status === 'voting_open' &&
    !isPublic
  ) {
    redirect(
      '/admin/awards/editions?error=voting_requires_public',
    )
  }

  validateEditionWindow({
    status,
    startsAt: votingStartsAt,
    endsAt: votingEndsAt,
  })

  const finalAwardId =
    canManageGlobal === true
      ? awardId
      : oldData.award_id

  const { data: award } = await admin
    .from('awards')
    .select('id,status')
    .eq('id', finalAwardId)
    .maybeSingle()

  if (
    !award ||
    award.status === 'archived'
  ) {
    redirect(
      '/admin/awards/editions?error=award_unavailable',
    )
  }

  if (ceremonyEventId) {
    const linked =
      await validateCeremonyEvent({
        admin,
        ceremonyEventId,
        editionId,
      })

    if (linked?.error) {
      redirect(
        `/admin/awards/editions?error=${linked.error}`,
      )
    }
  }

  const wasFrozen =
    oldData.leaderboard_visibility ===
    'frozen'
  const willBeFrozen =
    leaderboardVisibility === 'frozen'

  const { data: newData, error } =
    await admin
      .from('award_editions')
      .update({
        award_id: finalAwardId,
        year,
        edition_number: editionNumber,
        edition_label: editionLabel,
        theme: theme || null,
        description:
          description || null,
        status,
        is_public: isPublic,
        voting_starts_at:
          votingStartsAt,
        voting_ends_at: votingEndsAt,
        leaderboard_visibility:
          leaderboardVisibility,
        leaderboard_frozen_at:
          willBeFrozen
            ? wasFrozen &&
              oldData.leaderboard_frozen_at
              ? oldData.leaderboard_frozen_at
              : new Date().toISOString()
            : null,
        ceremony_event_id:
          ceremonyEventId,
      })
      .eq('id', editionId)
      .select()
      .single()

  if (error || !newData) {
    console.error(
      'updateAwardEdition',
      error,
    )
    redirect(
      `/admin/awards/editions?error=${encodeURIComponent(
        error?.code || 'update_failed',
      )}`,
    )
  }

  const { error: auditError } =
    await admin
      .from('audit_logs')
      .insert({
        actor_user_id: userId,
        action: 'award_edition_updated',
        entity_type: 'award_edition',
        entity_id: editionId,
        old_data: oldData,
        new_data: newData,
        metadata: {},
      })

  if (auditError) {
    console.error(
      'award edition audit',
      auditError,
    )
  }

  refreshAwardWorkspace()
  redirect(
    '/admin/awards/editions?updated=1',
  )
}
