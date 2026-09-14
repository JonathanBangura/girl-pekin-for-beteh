'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requirePermission } from '@/lib/auth/guards'

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim()
}

function refreshResults() {
  revalidatePath('/admin')
  revalidatePath('/admin/awards/results')
  revalidatePath('/admin/awards/editions')
  revalidatePath('/awards')
  revalidatePath('/nominees')
  revalidatePath('/results')
}

async function runEditionRpc(
  functionName:
    | 'freeze_award_results'
    | 'reconcile_award_results'
    | 'start_award_results_review'
    | 'approve_award_results'
    | 'publish_award_results',
  editionId: string,
) {
  const { supabase } =
    await requirePermission(
      'results.manage',
      '/admin/awards/results',
      'award_edition',
      editionId,
    )

  const { error } =
    await supabase.rpc(functionName, {
      p_award_edition_id:
        editionId,
    })

  if (error) {
    console.error(
      `${functionName} failed`,
      error,
    )

    const message =
      error.message || ''
    const code =
      message.includes(
        'RESULTS_RECONCILIATION_BLOCKED',
      )
        ? 'reconciliation_blocked'
        : message.includes(
              'RESULTS_APPROVAL_BLOCKED',
            )
          ? 'approval_blocked'
          : message.includes(
                'RESULTS_PUBLICATION_BLOCKED',
              )
            ? 'publication_blocked'
            : message.includes(
                  'RESULTS_SNAPSHOT_STALE',
                )
              ? 'snapshot_stale'
              : message.includes(
                    'RESULTS_WINNERS_INCOMPLETE',
                  )
                ? 'winners_incomplete'
                : message.includes(
                      'RESULTS_NO_ELIGIBLE_CATEGORIES',
                    )
                  ? 'no_eligible_categories'
                  : error.code ||
                    'operation_failed'

    redirect(
      `/admin/awards/results?edition=${encodeURIComponent(
        editionId,
      )}&error=${encodeURIComponent(
        code,
      )}`,
    )
  }

  refreshResults()

  redirect(
    `/admin/awards/results?edition=${encodeURIComponent(
      editionId,
    )}&done=${encodeURIComponent(
      functionName,
    )}`,
  )
}

export async function freezeResults(
  formData: FormData,
) {
  const editionId = text(
    formData,
    'edition_id',
  )

  if (!editionId) {
    redirect(
      '/admin/awards/results?error=missing_edition',
    )
  }

  await runEditionRpc(
    'freeze_award_results',
    editionId,
  )
}

export async function reconcileResults(
  formData: FormData,
) {
  const editionId = text(
    formData,
    'edition_id',
  )

  if (!editionId) {
    redirect(
      '/admin/awards/results?error=missing_edition',
    )
  }

  await runEditionRpc(
    'reconcile_award_results',
    editionId,
  )
}

export async function startResultsReview(
  formData: FormData,
) {
  const editionId = text(
    formData,
    'edition_id',
  )

  if (!editionId) {
    redirect(
      '/admin/awards/results?error=missing_edition',
    )
  }

  await runEditionRpc(
    'start_award_results_review',
    editionId,
  )
}

export async function setResultWinner(
  formData: FormData,
) {
  const editionId = text(
    formData,
    'edition_id',
  )
  const categoryId = text(
    formData,
    'category_id',
  )
  const nomineeId = text(
    formData,
    'nominee_id',
  )
  const note = text(
    formData,
    'decision_note',
  )
  const isWinner =
    text(formData, 'is_winner') ===
    'true'

  if (
    !editionId ||
    !categoryId ||
    !nomineeId
  ) {
    redirect(
      '/admin/awards/results?error=missing_fields',
    )
  }

  const { supabase } =
    await requirePermission(
      'results.manage',
      '/admin/awards/results',
      'award_edition',
      editionId,
    )

  const { error } = await supabase.rpc(
    'set_award_result_winner',
    {
      p_award_edition_id:
        editionId,
      p_category_id: categoryId,
      p_nominee_id: nomineeId,
      p_is_winner: isWinner,
      p_decision_note:
        note || null,
    },
  )

  if (error) {
    console.error(
      'setResultWinner failed',
      error,
    )
    redirect(
      `/admin/awards/results?edition=${encodeURIComponent(
        editionId,
      )}&error=${encodeURIComponent(
        error.code ||
          'winner_update_failed',
      )}`,
    )
  }

  refreshResults()

  redirect(
    `/admin/awards/results?edition=${encodeURIComponent(
      editionId,
    )}&done=winner_updated`,
  )
}

export async function approveResults(
  formData: FormData,
) {
  const editionId = text(
    formData,
    'edition_id',
  )

  if (!editionId) {
    redirect(
      '/admin/awards/results?error=missing_edition',
    )
  }

  await runEditionRpc(
    'approve_award_results',
    editionId,
  )
}

export async function publishResults(
  formData: FormData,
) {
  const editionId = text(
    formData,
    'edition_id',
  )

  if (!editionId) {
    redirect(
      '/admin/awards/results?error=missing_edition',
    )
  }

  await runEditionRpc(
    'publish_award_results',
    editionId,
  )
}
