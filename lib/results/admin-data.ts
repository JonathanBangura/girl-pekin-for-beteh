import { requirePermission } from '@/lib/auth/guards'
import { createAdminClient } from '@/lib/supabase/admin'

export async function getResultsAdminData(
  requestedEditionId?: string,
) {
  const { supabase } = await requirePermission(
    'results.manage',
    '/admin/awards/results',
  )

  const admin = createAdminClient()

  const [
    awardsResult,
    editionsResult,
    certificationsResult,
  ] = await Promise.all([
    admin
      .from('awards')
      .select('id,name,slug,status')
      .order('name', { ascending: true }),
    admin
      .from('award_editions')
      .select(
        'id,award_id,year,edition_label,status,is_public,voting_starts_at,voting_ends_at,leaderboard_visibility,leaderboard_frozen_at,results_published_at',
      )
      .order('year', { ascending: false }),
    admin
      .from('result_certifications')
      .select(
        'id,award_edition_id,award_name_snapshot,award_slug_snapshot,edition_label_snapshot,year_snapshot,status,frozen_at,snapshot_at,reconciled_at,review_started_at,approved_at,published_at,created_at,updated_at',
      ),
  ])

  for (const [label, result] of [
    ['awards', awardsResult],
    ['editions', editionsResult],
    ['certifications', certificationsResult],
  ] as const) {
    if (result.error) {
      console.error(`results admin ${label}`, result.error)
      throw new Error(`Unable to load ${label}.`)
    }
  }

  const awards = awardsResult.data ?? []
  const editions = editionsResult.data ?? []
  const certifications = certificationsResult.data ?? []

  const awardMap = new Map(
    awards.map((award) => [award.id, award]),
  )
  const certificationMap = new Map(
    certifications.map((certification) => [
      certification.award_edition_id,
      certification,
    ]),
  )

  const enrichedEditions = editions.map((edition) => ({
    ...edition,
    award: awardMap.get(edition.award_id) ?? null,
    certification:
      certificationMap.get(edition.id) ?? null,
  }))

  const selectedEdition =
    enrichedEditions.find(
      (edition) => edition.id === requestedEditionId,
    ) ??
    enrichedEditions.find((edition) =>
      [
        'voting_closed',
        'results_review',
        'results_published',
      ].includes(edition.status),
    ) ??
    enrichedEditions[0] ??
    null

  if (!selectedEdition) {
    return {
      editions: enrichedEditions,
      selectedEdition: null,
      certification: null,
      issues: [],
      categories: [],
      entries: [],
      requiredCategoryCount: 0,
      selectedWinnerCount: 0,
      snapshotStale: false,
    }
  }

  const [
    issuesResult,
    categoriesResult,
    nomineesResult,
  ] = await Promise.all([
    supabase.rpc('get_results_reconciliation_issues', {
      p_award_edition_id: selectedEdition.id,
    }),
    admin
      .from('award_categories')
      .select(
        'id,award_edition_id,name,slug,is_public,is_active,sort_order',
      )
      .eq('award_edition_id', selectedEdition.id)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true }),
    admin
      .from('nominees')
      .select(
        'id,award_edition_id,category_id,nominee_code,full_name,institution,status,is_public,photo_url',
      )
      .eq('award_edition_id', selectedEdition.id),
  ])

  if (issuesResult.error) {
    console.error(
      'results admin reconciliation issues',
      issuesResult.error,
    )
    throw new Error(
      'Unable to run results reconciliation checks.',
    )
  }

  if (categoriesResult.error) {
    console.error(
      'results admin categories',
      categoriesResult.error,
    )
    throw new Error('Unable to load result categories.')
  }

  if (nomineesResult.error) {
    console.error(
      'results admin nominees',
      nomineesResult.error,
    )
    throw new Error('Unable to load result nominees.')
  }

  const certification =
    selectedEdition.certification ?? null

  let entries: any[] = []

  if (certification) {
    const { data, error } = await admin
      .from('result_entries')
      .select(
        'id,certification_id,award_edition_id,category_id,nominee_id,category_name_snapshot,nominee_code_snapshot,nominee_name_snapshot,institution_snapshot,photo_url_snapshot,nominee_status_snapshot,eligible,snapshot_votes,snapshot_rank,decision,decision_note,decided_at',
      )
      .eq('certification_id', certification.id)
      .order('category_id', { ascending: true })
      .order('snapshot_rank', { ascending: true })

    if (error) {
      console.error('results admin entries', error)
      throw new Error('Unable to load result snapshot entries.')
    }

    entries = data ?? []
  }

  const categoryMap = new Map(
    (categoriesResult.data ?? []).map((category) => [
      category.id,
      category,
    ]),
  )
  const nomineeMap = new Map(
    (nomineesResult.data ?? []).map((nominee) => [
      nominee.id,
      nominee,
    ]),
  )

  const enrichedEntries = entries.map((entry) => ({
    ...entry,
    category: categoryMap.get(entry.category_id) ?? null,
    nominee: nomineeMap.get(entry.nominee_id) ?? null,
  }))

  const requiredCategories = (
    categoriesResult.data ?? []
  ).filter(
    (category) =>
      category.is_public &&
      category.is_active &&
      enrichedEntries.some(
        (entry) =>
          entry.category_id === category.id &&
          entry.eligible,
      ),
  )

  const selectedWinnerCount = new Set(
    enrichedEntries
      .filter((entry) => entry.decision === 'winner')
      .map((entry) => entry.category_id),
  ).size

  let snapshotStale = false

  if (certification?.snapshot_at) {
    const nomineeIds = (
      nomineesResult.data ?? []
    ).map((nominee) => nominee.id)

    if (nomineeIds.length) {
      const { count, error } = await admin
        .from('vote_ledger')
        .select('id', { count: 'exact', head: true })
        .in('nominee_id', nomineeIds)
        .gt('created_at', certification.snapshot_at)

      if (error) {
        console.error(
          'results admin snapshot freshness',
          error,
        )
      } else {
        snapshotStale = (count ?? 0) > 0
      }
    }
  }

  return {
    editions: enrichedEditions,
    selectedEdition,
    certification,
    issues: issuesResult.data ?? [],
    categories: categoriesResult.data ?? [],
    entries: enrichedEntries,
    requiredCategoryCount: requiredCategories.length,
    selectedWinnerCount,
    snapshotStale,
  }
}
