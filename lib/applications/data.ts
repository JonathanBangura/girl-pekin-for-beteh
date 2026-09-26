import { requireAuthenticated } from '@/lib/auth/guards'
import { createAdminClient } from '@/lib/supabase/admin'

async function canReviewEdition(
  supabase: any,
  editionId: string,
) {
  const [
    { data: review },
    { data: awardsManage },
  ] = await Promise.all([
    supabase.rpc('has_permission', {
      requested_permission_code: 'nominations.review',
      requested_scope_type: 'award_edition',
      requested_scope_id: editionId,
    }),
    supabase.rpc('has_permission', {
      requested_permission_code: 'awards.manage',
      requested_scope_type: 'award_edition',
      requested_scope_id: editionId,
    }),
  ])

  return review === true || awardsManage === true
}

async function signedApplicationFile(
  admin: ReturnType<typeof createAdminClient>,
  path?: string | null,
) {
  if (!path) return null

  const { data, error } = await admin.storage
    .from('nomination-applications')
    .createSignedUrl(path, 60 * 60)

  if (error) {
    console.error(
      'application signed file',
      error,
    )
    return null
  }

  return data.signedUrl
}

export async function getApplicationsManagementData({
  requestedEditionId,
  requestedStatus,
}: {
  requestedEditionId?: string
  requestedStatus?: string
}) {
  const { supabase } = await requireAuthenticated(
    '/admin/awards/applications',
  )
  const admin = createAdminClient()

  const [
    awardsResult,
    editionsResult,
    categoriesResult,
  ] = await Promise.all([
    admin
      .from('awards')
      .select('id,name')
      .order('name', { ascending: true }),
    admin
      .from('award_editions')
      .select(
        'id,award_id,year,edition_label,status',
      )
      .neq('status', 'archived')
      .order('year', { ascending: false }),
    admin
      .from('award_categories')
      .select(
        'id,award_edition_id,name',
      )
      .order('sort_order', { ascending: true }),
  ])

  if (
    awardsResult.error ||
    editionsResult.error ||
    categoriesResult.error
  ) {
    throw new Error(
      'Unable to load nomination review workspace.',
    )
  }

  const awardMap = new Map(
    (awardsResult.data ?? []).map((award) => [
      award.id,
      award,
    ]),
  )

  const allowedEditions: any[] = []

  for (const edition of editionsResult.data ?? []) {
    if (await canReviewEdition(supabase, edition.id)) {
      allowedEditions.push({
        ...edition,
        award:
          awardMap.get(edition.award_id) ?? null,
      })
    }
  }

  const selectedEdition =
    allowedEditions.find(
      (item) => item.id === requestedEditionId,
    ) ??
    allowedEditions[0] ??
    null

  if (!selectedEdition) {
    return {
      editions: [],
      selectedEdition: null,
      applications: [],
      reviews: [],
      counts: {
        submitted: 0,
        under_review: 0,
        approved: 0,
        rejected: 0,
        withdrawn: 0,
      },
    }
  }

  const reviewStatuses = [
    'submitted',
    'under_review',
    'approved',
    'rejected',
    'withdrawn',
  ]

  let nomineesQuery = admin
    .from('nominees')
    .select(
      'id,award_edition_id,category_id,nominee_code,full_name,institution,bio,photo_url,status,is_public,auth_user_id,submitted_at,review_started_at,reviewed_at,reviewed_by,review_note,created_at,updated_at',
    )
    .eq('award_edition_id', selectedEdition.id)
    .in('status', reviewStatuses)
    .order('updated_at', { ascending: false })

  if (
    requestedStatus &&
    reviewStatuses.includes(requestedStatus)
  ) {
    nomineesQuery = nomineesQuery.eq(
      'status',
      requestedStatus,
    )
  }

  const [nomineesResult, reviewsResult] =
    await Promise.all([
      nomineesQuery,
      admin
        .from('nominee_application_reviews')
        .select(
          'id,nominee_id,award_edition_id,from_status,to_status,note,reviewer_user_id,created_at',
        )
        .eq(
          'award_edition_id',
          selectedEdition.id,
        )
        .order('created_at', { ascending: false }),
    ])

  if (
    nomineesResult.error ||
    reviewsResult.error
  ) {
    throw new Error(
      'Unable to load nomination applications.',
    )
  }

  const nomineeIds = (nomineesResult.data ?? []).map(
    (nominee) => nominee.id,
  )

  const detailsResult = nomineeIds.length
    ? await admin
        .from('nominee_application_details')
        .select(
          'nominee_id,application_type,nominee_email,nominee_phone,nominator_name,nominator_relationship,nominator_email,nominator_phone,reference_name,reference_contact,declaration_accepted,photo_storage_path,photo_original_filename,supporting_storage_path,supporting_original_filename,submission_source,created_at',
        )
        .in('nominee_id', nomineeIds)
    : { data: [], error: null }

  if (detailsResult.error) {
    console.error(
      'nominee application details',
      detailsResult.error,
    )
    throw new Error(
      'Unable to load public application details.',
    )
  }

  const detailMap = new Map(
    (detailsResult.data ?? []).map((detail) => [
      detail.nominee_id,
      detail,
    ]),
  )

  const detailsWithFiles = new Map<
    string,
    {
      detail: any
      photo_signed_url: string | null
      supporting_signed_url: string | null
    }
  >()

  await Promise.all(
    (detailsResult.data ?? []).map(async (detail) => {
      const [
        photoSignedUrl,
        supportingSignedUrl,
      ] = await Promise.all([
        signedApplicationFile(
          admin,
          detail.photo_storage_path,
        ),
        signedApplicationFile(
          admin,
          detail.supporting_storage_path,
        ),
      ])

      detailsWithFiles.set(detail.nominee_id, {
        detail,
        photo_signed_url: photoSignedUrl,
        supporting_signed_url:
          supportingSignedUrl,
      })
    }),
  )

  const categories = categoriesResult.data ?? []
  const categoryMap = new Map(
    categories.map((category) => [
      category.id,
      category,
    ]),
  )

  const applications = (nomineesResult.data ?? []).map(
    (nominee) => {
      const privateDetail =
        detailsWithFiles.get(nominee.id)
      const detail =
        privateDetail?.detail ??
        detailMap.get(nominee.id) ??
        null

      return {
        ...nominee,
        category:
          categoryMap.get(nominee.category_id) ?? null,
        application_detail: detail
          ? {
              ...detail,
              photo_signed_url:
                privateDetail?.photo_signed_url ??
                null,
              supporting_signed_url:
                privateDetail?.supporting_signed_url ??
                null,
            }
          : null,
        history: (reviewsResult.data ?? []).filter(
          (review) =>
            review.nominee_id === nominee.id,
        ),
      }
    },
  )

  const allEditionNominees = await admin
    .from('nominees')
    .select('status')
    .eq('award_edition_id', selectedEdition.id)
    .in('status', reviewStatuses)

  const counts = {
    submitted: 0,
    under_review: 0,
    approved: 0,
    rejected: 0,
    withdrawn: 0,
  }

  for (const row of allEditionNominees.data ?? []) {
    if (row.status in counts) {
      counts[row.status as keyof typeof counts] += 1
    }
  }

  return {
    editions: allowedEditions,
    selectedEdition,
    applications,
    reviews: reviewsResult.data ?? [],
    counts,
  }
}
