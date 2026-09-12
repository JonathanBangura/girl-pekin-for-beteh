import { requirePermission } from '@/lib/auth/guards'
import { createAdminClient } from '@/lib/supabase/admin'

function countBy<T extends string>(
  rows: Array<Record<T, string | null>>,
  key: T,
) {
  const counts = new Map<string, number>()

  for (const row of rows) {
    const value = row[key]
    if (!value) continue
    counts.set(value, (counts.get(value) ?? 0) + 1)
  }

  return counts
}

export async function getAwardManagementData() {
  await requirePermission('awards.manage', '/admin/awards')

  const admin = createAdminClient()

  const [awardsResult, editionsResult] = await Promise.all([
    admin
      .from('awards')
      .select(
        'id,slug,name,summary,description,status,branding,created_at,updated_at',
      )
      .order('created_at', { ascending: false }),
    admin
      .from('award_editions')
      .select(
        'id,award_id,year,edition_number,edition_label,status,is_public,updated_at',
      )
      .order('year', { ascending: false }),
  ])

  if (awardsResult.error) {
    console.error('getAwardManagementData awards', awardsResult.error)
    throw new Error('Unable to load awards.')
  }

  if (editionsResult.error) {
    console.error('getAwardManagementData editions', editionsResult.error)
    throw new Error('Unable to load award editions.')
  }

  const editions = editionsResult.data ?? []
  const editionCounts = countBy(editions, 'award_id')

  return {
    awards: (awardsResult.data ?? []).map((award) => {
      const awardEditions = editions.filter(
        (edition) => edition.award_id === award.id,
      )

      return {
        ...award,
        edition_count: editionCounts.get(award.id) ?? 0,
        latest_edition: awardEditions[0] ?? null,
      }
    }),
    editions,
  }
}

export async function getEditionManagementData() {
  await requirePermission(
    'awards.manage',
    '/admin/awards/editions',
  )

  const admin = createAdminClient()

  const [
    awardsResult,
    editionsResult,
    eventsResult,
    categoriesResult,
    nomineesResult,
  ] = await Promise.all([
    admin
      .from('awards')
      .select('id,name,slug,status')
      .neq('status', 'archived')
      .order('name', { ascending: true }),
    admin
      .from('award_editions')
      .select(
        [
          'id',
          'award_id',
          'year',
          'edition_number',
          'edition_label',
          'theme',
          'description',
          'status',
          'is_public',
          'voting_starts_at',
          'voting_ends_at',
          'leaderboard_visibility',
          'leaderboard_frozen_at',
          'results_published_at',
          'branding',
          'ceremony_event_id',
          'created_at',
          'updated_at',
        ].join(','),
      )
      .order('year', { ascending: false })
      .order('created_at', { ascending: false }),
    admin
      .from('events')
      .select(
        'id,award_edition_id,slug,title,starts_at,venue,status,is_public',
      )
      .neq('status', 'archived')
      .order('starts_at', { ascending: true }),
    admin
      .from('award_categories')
      .select('id,award_edition_id'),
    admin
      .from('nominees')
      .select('id,award_edition_id'),
  ])

  if (awardsResult.error) {
    console.error('getEditionManagementData awards', awardsResult.error)
    throw new Error('Unable to load awards for edition management.')
  }

  if (editionsResult.error) {
    console.error('getEditionManagementData editions', editionsResult.error)
    throw new Error('Unable to load award editions.')
  }

  if (eventsResult.error) {
    console.error('getEditionManagementData events', eventsResult.error)
    throw new Error('Unable to load events for ceremony linking.')
  }

  if (categoriesResult.error) {
    console.error('getEditionManagementData categories', categoriesResult.error)
    throw new Error('Unable to load category counts.')
  }

  if (nomineesResult.error) {
    console.error('getEditionManagementData nominees', nomineesResult.error)
    throw new Error('Unable to load nominee counts.')
  }

  const awards = awardsResult.data ?? []
  const editions = editionsResult.data ?? []
  const events = eventsResult.data ?? []
  const categoryCounts = countBy(
    categoriesResult.data ?? [],
    'award_edition_id',
  )
  const nomineeCounts = countBy(
    nomineesResult.data ?? [],
    'award_edition_id',
  )

  const awardMap = new Map(
    awards.map((award) => [award.id, award]),
  )
  const eventMap = new Map(
    events.map((event) => [event.id, event]),
  )

  return {
    awards,
    events,
    editions: editions.map((edition) => ({
      ...edition,
      award: awardMap.get(edition.award_id) ?? null,
      ceremony_event: edition.ceremony_event_id
        ? eventMap.get(edition.ceremony_event_id) ?? null
        : null,
      category_count: categoryCounts.get(edition.id) ?? 0,
      nominee_count: nomineeCounts.get(edition.id) ?? 0,
    })),
  }
}
