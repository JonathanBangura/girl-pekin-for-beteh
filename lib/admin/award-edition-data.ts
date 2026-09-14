import { requireAnyAssignedPermission } from '@/lib/auth/guards'
import { createAdminClient } from '@/lib/supabase/admin'

function countBy<T extends string>(
  rows: Array<Record<T, string | null>>,
  key: T,
) {
  const counts =
    new Map<string, number>()

  for (const row of rows) {
    const value = row[key]
    if (!value) continue

    counts.set(
      value,
      (counts.get(value) ?? 0) + 1,
    )
  }

  return counts
}

async function getAwardsAccess(
  nextPath: string,
) {
  const auth =
    await requireAnyAssignedPermission(
      'awards.manage',
      nextPath,
    )

  const { data: canManageGlobal } =
    await auth.supabase.rpc(
      'has_permission',
      {
        requested_permission_code:
          'awards.manage',
        requested_scope_type: null,
        requested_scope_id: null,
      },
    )

  return {
    ...auth,
    canManageGlobal:
      canManageGlobal === true,
  }
}

export async function getAwardManagementData() {
  const {
    supabase,
    canManageGlobal,
  } = await getAwardsAccess(
    '/admin/awards',
  )

  const editionsResult =
    await supabase
      .from('award_editions')
      .select(
        'id,award_id,year,edition_number,edition_label,status,is_public,updated_at',
      )
      .order('year', {
        ascending: false,
      })

  if (editionsResult.error) {
    console.error(
      'getAwardManagementData editions',
      editionsResult.error,
    )
    throw new Error(
      'Unable to load award editions.',
    )
  }

  const editions =
    editionsResult.data ?? []
  const awardIds = [
    ...new Set(
      editions.map(
        (edition) => edition.award_id,
      ),
    ),
  ]

  const admin = createAdminClient()

  let awardsQuery = admin
    .from('awards')
    .select(
      'id,slug,name,summary,description,status,branding,created_at,updated_at',
    )
    .order('created_at', {
      ascending: false,
    })

  if (!canManageGlobal) {
    if (!awardIds.length) {
      return {
        awards: [],
        editions,
        canManageGlobal,
      }
    }

    awardsQuery =
      awardsQuery.in('id', awardIds)
  }

  const awardsResult =
    await awardsQuery

  if (awardsResult.error) {
    console.error(
      'getAwardManagementData awards',
      awardsResult.error,
    )
    throw new Error(
      'Unable to load awards.',
    )
  }

  const editionCounts =
    countBy(editions, 'award_id')

  return {
    awards: (
      awardsResult.data ?? []
    ).map((award) => {
      const awardEditions =
        editions.filter(
          (edition) =>
            edition.award_id ===
            award.id,
        )

      return {
        ...award,
        edition_count:
          editionCounts.get(award.id) ??
          0,
        latest_edition:
          awardEditions[0] ?? null,
      }
    }),
    editions,
    canManageGlobal,
  }
}

export async function getEditionManagementData() {
  const {
    supabase,
    canManageGlobal,
  } = await getAwardsAccess(
    '/admin/awards/editions',
  )

  const [
    editionsResult,
    categoriesResult,
    nomineesResult,
  ] = await Promise.all([
    supabase
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
      .order('year', {
        ascending: false,
      })
      .order('created_at', {
        ascending: false,
      }),
    supabase
      .from('award_categories')
      .select(
        'id,award_edition_id',
      ),
    supabase
      .from('nominees')
      .select(
        'id,award_edition_id',
      ),
  ])

  if (editionsResult.error) {
    console.error(
      'getEditionManagementData editions',
      editionsResult.error,
    )
    throw new Error(
      'Unable to load award editions.',
    )
  }

  if (categoriesResult.error) {
    console.error(
      'getEditionManagementData categories',
      categoriesResult.error,
    )
    throw new Error(
      'Unable to load category counts.',
    )
  }

  if (nomineesResult.error) {
    console.error(
      'getEditionManagementData nominees',
      nomineesResult.error,
    )
    throw new Error(
      'Unable to load nominee counts.',
    )
  }

  const editions =
    editionsResult.data ?? []
  const editionIds =
    editions.map((edition) => edition.id)
  const awardIds = [
    ...new Set(
      editions.map(
        (edition) => edition.award_id,
      ),
    ),
  ]

  const admin = createAdminClient()

  let awards: any[] = []

  if (canManageGlobal) {
    const result = await admin
      .from('awards')
      .select('id,name,slug,status')
      .neq('status', 'archived')
      .order('name', {
        ascending: true,
      })

    if (result.error) {
      console.error(
        'getEditionManagementData awards',
        result.error,
      )
      throw new Error(
        'Unable to load awards for edition management.',
      )
    }

    awards = result.data ?? []
  } else if (awardIds.length) {
    const result = await admin
      .from('awards')
      .select('id,name,slug,status')
      .in('id', awardIds)
      .order('name', {
        ascending: true,
      })

    if (result.error) {
      console.error(
        'getEditionManagementData scoped awards',
        result.error,
      )
      throw new Error(
        'Unable to load awards for edition management.',
      )
    }

    awards = result.data ?? []
  }

  let events: any[] = []

  if (canManageGlobal) {
    const result = await admin
      .from('events')
      .select(
        'id,award_edition_id,slug,title,starts_at,venue,status,is_public',
      )
      .neq('status', 'archived')
      .order('starts_at', {
        ascending: true,
      })

    if (result.error) {
      console.error(
        'getEditionManagementData events',
        result.error,
      )
      throw new Error(
        'Unable to load events for ceremony linking.',
      )
    }

    events = result.data ?? []
  } else {
    const [linked, unlinked] =
      await Promise.all([
        editionIds.length
          ? admin
              .from('events')
              .select(
                'id,award_edition_id,slug,title,starts_at,venue,status,is_public',
              )
              .in(
                'award_edition_id',
                editionIds,
              )
              .neq(
                'status',
                'archived',
              )
          : Promise.resolve({
              data: [],
              error: null,
            }),
        admin
          .from('events')
          .select(
            'id,award_edition_id,slug,title,starts_at,venue,status,is_public',
          )
          .is(
            'award_edition_id',
            null,
          )
          .neq('status', 'archived'),
      ])

    if (
      linked.error ||
      unlinked.error
    ) {
      console.error(
        'getEditionManagementData scoped events',
        {
          linked: linked.error,
          unlinked: unlinked.error,
        },
      )
      throw new Error(
        'Unable to load events for ceremony linking.',
      )
    }

    const eventMap = new Map<
      string,
      any
    >()

    for (const event of [
      ...(linked.data ?? []),
      ...(unlinked.data ?? []),
    ]) {
      eventMap.set(event.id, event)
    }

    events = [
      ...eventMap.values(),
    ].sort((a, b) =>
      String(
        a.starts_at ?? '',
      ).localeCompare(
        String(b.starts_at ?? ''),
      ),
    )
  }

  const categoryCounts = countBy(
    categoriesResult.data ?? [],
    'award_edition_id',
  )
  const nomineeCounts = countBy(
    nomineesResult.data ?? [],
    'award_edition_id',
  )

  const awardMap = new Map(
    awards.map((award) => [
      award.id,
      award,
    ]),
  )
  const eventMap = new Map(
    events.map((event) => [
      event.id,
      event,
    ]),
  )

  return {
    awards,
    events,
    canManageGlobal,
    editions: editions.map(
      (edition) => ({
        ...edition,
        award:
          awardMap.get(
            edition.award_id,
          ) ?? null,
        ceremony_event:
          edition.ceremony_event_id
            ? eventMap.get(
                edition.ceremony_event_id,
              ) ?? null
            : null,
        category_count:
          categoryCounts.get(
            edition.id,
          ) ?? 0,
        nominee_count:
          nomineeCounts.get(
            edition.id,
          ) ?? 0,
      }),
    ),
  }
}
