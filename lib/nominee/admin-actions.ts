'use server'

import { randomBytes, randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAuthenticated } from '@/lib/auth/guards'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  hashTicketToken,
  makeTicketToken,
} from '@/lib/ticketing/ticket-security'

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim()
}

function refreshCommunication(editionId?: string) {
  revalidatePath('/admin/communication')
  revalidatePath('/nominee')
  revalidatePath('/nominee/announcements')
  revalidatePath('/nominee/documents')
  revalidatePath('/nominee/campaign')
  revalidatePath('/nominee/pass')

  if (editionId) {
    revalidatePath(
      `/admin/communication?edition=${editionId}`,
    )
  }
}

async function requireEditionManager(
  editionId: string,
) {
  const auth = await requireAuthenticated(
    '/admin/communication',
  )

  const [
    { data: awardsManage },
    { data: nominationsReview },
  ] = await Promise.all([
    auth.supabase.rpc('has_permission', {
      requested_permission_code: 'awards.manage',
      requested_scope_type: 'award_edition',
      requested_scope_id: editionId,
    }),
    auth.supabase.rpc('has_permission', {
      requested_permission_code: 'nominations.review',
      requested_scope_type: 'award_edition',
      requested_scope_id: editionId,
    }),
  ])

  if (
    awardsManage !== true &&
    nominationsReview !== true
  ) {
    redirect('/unauthorized')
  }

  return auth
}

async function requireEventManager(
  eventId: string,
) {
  const auth = await requireAuthenticated(
    '/admin/communication',
  )

  const { data } = await auth.supabase.rpc(
    'has_permission',
    {
      requested_permission_code: 'events.manage',
      requested_scope_type: 'event',
      requested_scope_id: eventId,
    },
  )

  if (data !== true) {
    redirect('/unauthorized')
  }

  return auth
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
    console.error('nominee communication audit', error)
  }
}

export async function createNomineeAnnouncement(
  formData: FormData,
) {
  const editionId = text(formData, 'award_edition_id')
  const title = text(formData, 'title')
  const body = text(formData, 'body')
  const priority =
    text(formData, 'priority') || 'information'
  const expiresAt =
    text(formData, 'expires_at') || null
  const publishNow =
    formData.get('is_published') === 'on'

  if (!editionId || !title || !body) {
    redirect(
      '/admin/communication?error=missing_announcement_fields',
    )
  }

  if (
    !['information', 'important', 'urgent'].includes(
      priority,
    )
  ) {
    redirect(
      `/admin/communication?edition=${editionId}&error=invalid_priority`,
    )
  }

  const { userId } = await requireEditionManager(
    editionId,
  )
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('nominee_announcements')
    .insert({
      award_edition_id: editionId,
      title,
      body,
      priority,
      is_published: publishNow,
      published_at: publishNow
        ? new Date().toISOString()
        : null,
      expires_at: expiresAt
        ? new Date(expiresAt).toISOString()
        : null,
      created_by: userId,
      updated_by: userId,
    })
    .select()
    .single()

  if (error || !data) {
    console.error(
      'createNomineeAnnouncement',
      error,
    )
    redirect(
      `/admin/communication?edition=${editionId}&error=${encodeURIComponent(
        error?.code || 'announcement_create_failed',
      )}`,
    )
  }

  await audit({
    admin,
    actorUserId: userId,
    action: 'nominee_announcement_created',
    entityType: 'nominee_announcement',
    entityId: data.id,
    newData: data,
  })

  refreshCommunication(editionId)
  redirect(
    `/admin/communication?edition=${editionId}&announcement_created=1`,
  )
}

export async function setNomineeAnnouncementPublished(
  formData: FormData,
) {
  const announcementId = text(
    formData,
    'announcement_id',
  )
  const shouldPublish =
    text(formData, 'publish') === 'true'

  if (!announcementId) {
    redirect(
      '/admin/communication?error=announcement_not_found',
    )
  }

  const admin = createAdminClient()

  const { data: current, error: currentError } =
    await admin
      .from('nominee_announcements')
      .select('*')
      .eq('id', announcementId)
      .maybeSingle()

  if (currentError || !current) {
    redirect(
      '/admin/communication?error=announcement_not_found',
    )
  }

  const { userId } = await requireEditionManager(
    current.award_edition_id,
  )

  const { data: updated, error } = await admin
    .from('nominee_announcements')
    .update({
      is_published: shouldPublish,
      published_at: shouldPublish
        ? current.published_at ??
          new Date().toISOString()
        : null,
      updated_by: userId,
    })
    .eq('id', announcementId)
    .select()
    .single()

  if (error || !updated) {
    console.error(
      'setNomineeAnnouncementPublished',
      error,
    )
    redirect(
      `/admin/communication?edition=${current.award_edition_id}&error=announcement_update_failed`,
    )
  }

  await audit({
    admin,
    actorUserId: userId,
    action: shouldPublish
      ? 'nominee_announcement_published'
      : 'nominee_announcement_unpublished',
    entityType: 'nominee_announcement',
    entityId: announcementId,
    oldData: {
      is_published: current.is_published,
      published_at: current.published_at,
    },
    newData: {
      is_published: updated.is_published,
      published_at: updated.published_at,
    },
  })

  refreshCommunication(current.award_edition_id)
  redirect(
    `/admin/communication?edition=${current.award_edition_id}&announcement_updated=1`,
  )
}

const allowedMimeTypes = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
])

function extensionForFile(file: File) {
  const name = file.name.toLowerCase()
  const match = name.match(/\.([a-z0-9]{1,8})$/)
  return match?.[1] ?? 'bin'
}

export async function uploadNomineeResource(
  formData: FormData,
) {
  const editionId = text(formData, 'award_edition_id')
  const title = text(formData, 'title')
  const description = text(formData, 'description')
  const resourceType =
    text(formData, 'resource_type') || 'document'
  const expiresAt =
    text(formData, 'expires_at') || null
  const publishNow =
    formData.get('is_published') === 'on'
  const file = formData.get('file')

  if (
    !editionId ||
    !title ||
    !(file instanceof File) ||
    file.size <= 0
  ) {
    redirect(
      '/admin/communication?error=missing_resource_fields',
    )
  }

  if (
    !['document', 'campaign_asset', 'ceremony'].includes(
      resourceType,
    )
  ) {
    redirect(
      `/admin/communication?edition=${editionId}&error=invalid_resource_type`,
    )
  }

  if (
    file.size > 10 * 1024 * 1024 ||
    !allowedMimeTypes.has(file.type)
  ) {
    redirect(
      `/admin/communication?edition=${editionId}&error=invalid_resource_file`,
    )
  }

  const { userId } = await requireEditionManager(
    editionId,
  )
  const admin = createAdminClient()

  const extension = extensionForFile(file)
  const storagePath =
    `${editionId}/${randomUUID()}.${extension}`

  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await admin.storage
    .from('nominee-resources')
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) {
    console.error(
      'uploadNomineeResource storage',
      uploadError,
    )
    redirect(
      `/admin/communication?edition=${editionId}&error=resource_upload_failed`,
    )
  }

  const { data, error } = await admin
    .from('nominee_resources')
    .insert({
      award_edition_id: editionId,
      title,
      description: description || null,
      resource_type: resourceType,
      storage_bucket: 'nominee-resources',
      storage_path: storagePath,
      original_filename: file.name,
      mime_type: file.type,
      file_size_bytes: file.size,
      is_published: publishNow,
      published_at: publishNow
        ? new Date().toISOString()
        : null,
      expires_at: expiresAt
        ? new Date(expiresAt).toISOString()
        : null,
      created_by: userId,
      updated_by: userId,
    })
    .select()
    .single()

  if (error || !data) {
    console.error(
      'uploadNomineeResource metadata',
      error,
    )

    await admin.storage
      .from('nominee-resources')
      .remove([storagePath])

    redirect(
      `/admin/communication?edition=${editionId}&error=resource_create_failed`,
    )
  }

  await audit({
    admin,
    actorUserId: userId,
    action: 'nominee_resource_uploaded',
    entityType: 'nominee_resource',
    entityId: data.id,
    newData: {
      title: data.title,
      resource_type: data.resource_type,
      original_filename: data.original_filename,
      is_published: data.is_published,
    },
    metadata: {
      award_edition_id: editionId,
      storage_path: storagePath,
    },
  })

  refreshCommunication(editionId)
  redirect(
    `/admin/communication?edition=${editionId}&resource_created=1`,
  )
}

export async function setNomineeResourcePublished(
  formData: FormData,
) {
  const resourceId = text(formData, 'resource_id')
  const shouldPublish =
    text(formData, 'publish') === 'true'

  if (!resourceId) {
    redirect(
      '/admin/communication?error=resource_not_found',
    )
  }

  const admin = createAdminClient()

  const { data: current, error: currentError } =
    await admin
      .from('nominee_resources')
      .select('*')
      .eq('id', resourceId)
      .maybeSingle()

  if (currentError || !current) {
    redirect(
      '/admin/communication?error=resource_not_found',
    )
  }

  const { userId } = await requireEditionManager(
    current.award_edition_id,
  )

  const { data: updated, error } = await admin
    .from('nominee_resources')
    .update({
      is_published: shouldPublish,
      published_at: shouldPublish
        ? current.published_at ??
          new Date().toISOString()
        : null,
      updated_by: userId,
    })
    .eq('id', resourceId)
    .select()
    .single()

  if (error || !updated) {
    console.error(
      'setNomineeResourcePublished',
      error,
    )
    redirect(
      `/admin/communication?edition=${current.award_edition_id}&error=resource_update_failed`,
    )
  }

  await audit({
    admin,
    actorUserId: userId,
    action: shouldPublish
      ? 'nominee_resource_published'
      : 'nominee_resource_unpublished',
    entityType: 'nominee_resource',
    entityId: resourceId,
    oldData: {
      is_published: current.is_published,
    },
    newData: {
      is_published: updated.is_published,
    },
  })

  refreshCommunication(current.award_edition_id)
  redirect(
    `/admin/communication?edition=${current.award_edition_id}&resource_updated=1`,
  )
}

function makePassTicketCode(startsAt?: string | null) {
  const year = startsAt
    ? String(new Date(startsAt).getUTCFullYear()).slice(-2)
    : String(new Date().getUTCFullYear()).slice(-2)

  return `TKT-${year}-N${randomBytes(5)
    .toString('hex')
    .toUpperCase()}`
}

export async function issueNomineeCeremonyPass(
  formData: FormData,
) {
  const nomineeId = text(formData, 'nominee_id')
  const eventId = text(formData, 'event_id')
  const editionId = text(formData, 'award_edition_id')

  if (!nomineeId || !eventId) {
    redirect(
      editionId
        ? `/admin/communication?edition=${editionId}&error=missing_pass_fields`
        : '/admin/communication?error=missing_pass_fields',
    )
  }

  const auth = await requireEventManager(eventId)
  const admin = createAdminClient()

  const { data: event } = await admin
    .from('events')
    .select('id,starts_at,award_edition_id')
    .eq('id', eventId)
    .maybeSingle()

  if (!event) {
    redirect(
      `/admin/communication?edition=${editionId}&error=event_not_found`,
    )
  }

  const ticketId = randomUUID()
  const rawToken = makeTicketToken(ticketId)
  const qrHash = hashTicketToken(rawToken)

  const { error } = await auth.supabase.rpc(
    'issue_nominee_ceremony_pass',
    {
      p_nominee_id: nomineeId,
      p_event_id: eventId,
      p_ticket_id: ticketId,
      p_ticket_code: makePassTicketCode(
        event.starts_at,
      ),
      p_qr_token_hash: qrHash,
    },
  )

  if (error) {
    console.error(
      'issueNomineeCeremonyPass',
      error,
    )

    const message = error.message || ''
    const code =
      message.includes('active ceremony pass already exists')
        ? 'pass_already_exists'
        : message.includes('linked to a portal account')
          ? 'pass_requires_linked_account'
          : message.includes('approved or published')
            ? 'pass_nominee_not_eligible'
            : message.includes('same award edition')
              ? 'pass_event_mismatch'
              : error.code === '42501'
                ? '42501'
                : 'pass_issue_failed'

    redirect(
      `/admin/communication?edition=${
        event.award_edition_id ?? editionId
      }&error=${encodeURIComponent(code)}`,
    )
  }

  refreshCommunication(
    event.award_edition_id ?? editionId,
  )
  redirect(
    `/admin/communication?edition=${
      event.award_edition_id ?? editionId
    }&pass_issued=1`,
  )
}

export async function revokeNomineeCeremonyPass(
  formData: FormData,
) {
  const passId = text(formData, 'pass_id')
  const eventId = text(formData, 'event_id')
  const editionId = text(formData, 'award_edition_id')
  const reason = text(formData, 'reason')

  if (!passId || !eventId) {
    redirect(
      `/admin/communication?edition=${editionId}&error=pass_not_found`,
    )
  }

  const auth = await requireEventManager(eventId)

  const { error } = await auth.supabase.rpc(
    'revoke_nominee_ceremony_pass',
    {
      p_pass_id: passId,
      p_reason: reason || null,
    },
  )

  if (error) {
    console.error(
      'revokeNomineeCeremonyPass',
      error,
    )
    redirect(
      `/admin/communication?edition=${editionId}&error=${encodeURIComponent(
        error.code || 'pass_revoke_failed',
      )}`,
    )
  }

  refreshCommunication(editionId)
  redirect(
    `/admin/communication?edition=${editionId}&pass_revoked=1`,
  )
}
