'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAuthenticated } from '@/lib/auth/guards'
import { createAdminClient } from '@/lib/supabase/admin'

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim()
}

async function requireReviewer(
  editionId: string,
) {
  const auth = await requireAuthenticated(
    '/admin/awards/applications',
  )

  const [
    { data: review },
    { data: awardsManage },
  ] = await Promise.all([
    auth.supabase.rpc('has_permission', {
      requested_permission_code: 'nominations.review',
      requested_scope_type: 'award_edition',
      requested_scope_id: editionId,
    }),
    auth.supabase.rpc('has_permission', {
      requested_permission_code: 'awards.manage',
      requested_scope_type: 'award_edition',
      requested_scope_id: editionId,
    }),
  ])

  if (review !== true && awardsManage !== true) {
    redirect('/unauthorized')
  }

  return auth
}

const transitions: Record<
  string,
  Record<string, string>
> = {
  submitted: {
    start_review: 'under_review',
    withdraw: 'withdrawn',
  },
  under_review: {
    approve: 'approved',
    reject: 'rejected',
    withdraw: 'withdrawn',
  },
  rejected: {
    reopen: 'under_review',
  },
}

export async function transitionNomineeApplication(
  formData: FormData,
) {
  const nomineeId = text(formData, 'nominee_id')
  const action = text(formData, 'action')
  const note = text(formData, 'note')
  const returnEdition = text(
    formData,
    'award_edition_id',
  )

  if (!nomineeId || !action) {
    redirect(
      '/admin/awards/applications?error=missing_fields',
    )
  }

  const admin = createAdminClient()

  const { data: nominee, error: loadError } =
    await admin
      .from('nominees')
      .select('*')
      .eq('id', nomineeId)
      .maybeSingle()

  if (loadError || !nominee) {
    redirect(
      '/admin/awards/applications?error=not_found',
    )
  }

  const { userId } = await requireReviewer(
    nominee.award_edition_id,
  )

  const nextStatus =
    transitions[nominee.status]?.[action]

  if (!nextStatus) {
    redirect(
      `/admin/awards/applications?edition=${
        returnEdition || nominee.award_edition_id
      }&error=invalid_transition`,
    )
  }

  if (action === 'reject' && note.length < 3) {
    redirect(
      `/admin/awards/applications?edition=${
        returnEdition || nominee.award_edition_id
      }&error=reject_note_required`,
    )
  }

  const update = {
    status: nextStatus,
    is_public: false,
    reviewed_by:
      ['approved', 'rejected', 'withdrawn'].includes(
        nextStatus,
      )
        ? userId
        : null,
    review_note:
      note ||
      (nextStatus === 'under_review'
        ? null
        : nominee.review_note),
  }

  const { data: updated, error } = await admin
    .from('nominees')
    .update(update)
    .eq('id', nominee.id)
    .select()
    .single()

  if (error || !updated) {
    console.error(
      'transitionNomineeApplication',
      error,
    )
    redirect(
      `/admin/awards/applications?edition=${
        returnEdition || nominee.award_edition_id
      }&error=transition_failed`,
    )
  }

  const { error: historyError } = await admin
    .from('nominee_application_reviews')
    .insert({
      nominee_id: nominee.id,
      award_edition_id:
        nominee.award_edition_id,
      from_status: nominee.status,
      to_status: nextStatus,
      note: note || null,
      reviewer_user_id: userId,
    })

  if (historyError) {
    console.error(
      'nominee application review history',
      historyError,
    )
  }

  const { error: auditError } = await admin
    .from('audit_logs')
    .insert({
      actor_user_id: userId,
      action: `nominee_application_${nextStatus}`,
      entity_type: 'nominee',
      entity_id: nominee.id,
      old_data: {
        status: nominee.status,
        review_note: nominee.review_note,
      },
      new_data: {
        status: nextStatus,
        review_note: note || null,
      },
      metadata: {
        award_edition_id:
          nominee.award_edition_id,
        review_action: action,
      },
    })

  if (auditError) {
    console.error(
      'nominee application audit',
      auditError,
    )
  }

  revalidatePath('/admin')
  revalidatePath('/admin/awards/applications')
  revalidatePath('/admin/awards/nominees')

  redirect(
    `/admin/awards/applications?edition=${
      returnEdition || nominee.award_edition_id
    }&updated=1`,
  )
}
