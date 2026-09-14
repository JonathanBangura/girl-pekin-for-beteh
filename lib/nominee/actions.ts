'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requirePermission } from '@/lib/auth/guards'
import { createAdminClient } from '@/lib/supabase/admin'

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim()
}

export async function updateMyNomineeProfile(
  formData: FormData,
) {
  const { userId } = await requirePermission(
    'nominee.portal',
    '/nominee/profile',
  )

  const institution = text(formData, 'institution')
  const bio = text(formData, 'bio')

  if (bio.length > 3000 || institution.length > 300) {
    redirect('/nominee/profile?error=too_long')
  }

  const admin = createAdminClient()

  const { data: nominee, error: nomineeError } =
    await admin
      .from('nominees')
      .select(
        'id,auth_user_id,nominee_code,full_name,institution,bio,status,is_public,award_edition_id',
      )
      .eq('auth_user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

  if (nomineeError || !nominee) {
    console.error(
      'updateMyNomineeProfile nominee',
      nomineeError,
    )
    redirect('/nominee/profile?error=nominee_not_found')
  }

  if (
    ['disqualified', 'withdrawn', 'archived'].includes(
      nominee.status,
    )
  ) {
    redirect('/nominee/profile?error=profile_locked')
  }

  const { data: updated, error } = await admin
    .from('nominees')
    .update({
      institution: institution || null,
      bio: bio || null,
    })
    .eq('id', nominee.id)
    .select(
      'id,full_name,institution,bio,status,is_public,award_edition_id',
    )
    .single()

  if (error || !updated) {
    console.error('updateMyNomineeProfile update', error)
    redirect('/nominee/profile?error=update_failed')
  }

  const { error: auditError } = await admin
    .from('audit_logs')
    .insert({
      actor_user_id: userId,
      action: 'nominee_self_profile_updated',
      entity_type: 'nominee',
      entity_id: nominee.id,
      old_data: {
        institution: nominee.institution,
        bio: nominee.bio,
      },
      new_data: {
        institution: updated.institution,
        bio: updated.bio,
      },
      metadata: {
        award_edition_id: nominee.award_edition_id,
        self_service: true,
      },
    })

  if (auditError) {
    console.error(
      'updateMyNomineeProfile audit',
      auditError,
    )
  }

  revalidatePath('/nominee')
  revalidatePath('/nominee/profile')
  revalidatePath(`/nominees/${nominee.nominee_code}`)

  redirect('/nominee/profile?updated=1')
}
