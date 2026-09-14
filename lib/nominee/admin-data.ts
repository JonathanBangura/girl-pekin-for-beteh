import { requireAuthenticated } from '@/lib/auth/guards'
import { createAdminClient } from '@/lib/supabase/admin'

async function canManageEdition(
  supabase: any,
  editionId: string,
) {
  const [
    { data: awardsManage },
    { data: nominationsReview },
  ] = await Promise.all([
    supabase.rpc('has_permission', {
      requested_permission_code: 'awards.manage',
      requested_scope_type: 'award_edition',
      requested_scope_id: editionId,
    }),
    supabase.rpc('has_permission', {
      requested_permission_code: 'nominations.review',
      requested_scope_type: 'award_edition',
      requested_scope_id: editionId,
    }),
  ])

  return awardsManage === true || nominationsReview === true
}

async function canManageEvent(
  supabase: any,
  eventId: string,
) {
  const { data } = await supabase.rpc('has_permission', {
    requested_permission_code: 'events.manage',
    requested_scope_type: 'event',
    requested_scope_id: eventId,
  })

  return data === true
}

export async function getNomineeCommunicationAdminData(
  requestedEditionId?: string,
) {
  const { supabase } = await requireAuthenticated(
    '/admin/communication',
  )
  const admin = createAdminClient()

  const [
    awardsResult,
    editionsResult,
    allEventsResult,
  ] = await Promise.all([
    admin
      .from('awards')
      .select('id,name,slug,status')
      .order('name', { ascending: true }),
    admin
      .from('award_editions')
      .select(
        'id,award_id,year,edition_label,status,is_public,ceremony_event_id',
      )
      .neq('status', 'archived')
      .order('year', { ascending: false }),
    admin
      .from('events')
      .select(
        'id,award_edition_id,title,slug,venue,starts_at,status,is_public',
      )
      .neq('status', 'archived')
      .order('starts_at', { ascending: true }),
  ])

  if (
    awardsResult.error ||
    editionsResult.error ||
    allEventsResult.error
  ) {
    console.error(
      'nominee communication source data',
      awardsResult.error ||
        editionsResult.error ||
        allEventsResult.error,
    )
    throw new Error(
      'Unable to load nominee communication workspace.',
    )
  }

  const awards = awardsResult.data ?? []
  const allEvents = allEventsResult.data ?? []
  const awardMap = new Map(
    awards.map((award) => [award.id, award]),
  )

  const eventPermissions = new Map<string, boolean>()

  for (const event of allEvents) {
    eventPermissions.set(
      event.id,
      await canManageEvent(supabase, event.id),
    )
  }

  const allowedEditions: any[] = []

  for (const edition of editionsResult.data ?? []) {
    const managesEdition = await canManageEdition(
      supabase,
      edition.id,
    )
    const hasManagedEvent = allEvents.some(
      (event) =>
        event.award_edition_id === edition.id &&
        eventPermissions.get(event.id) === true,
    )

    if (managesEdition || hasManagedEvent) {
      allowedEditions.push({
        ...edition,
        award: awardMap.get(edition.award_id) ?? null,
        can_manage_edition: managesEdition,
      })
    }
  }

  const selectedEdition =
    allowedEditions.find(
      (edition) => edition.id === requestedEditionId,
    ) ??
    allowedEditions[0] ??
    null

  if (!selectedEdition) {
    return {
      editions: allowedEditions,
      selectedEdition: null,
      announcements: [],
      resources: [],
      nominees: [],
      events: [],
      passes: [],
    }
  }

  const selectedEvents = allEvents.filter(
    (event) =>
      event.award_edition_id === selectedEdition.id,
  )

  const nomineesResult = await admin
    .from('nominees')
    .select(
      'id,award_edition_id,nominee_code,full_name,institution,status,is_public,auth_user_id',
    )
    .eq('award_edition_id', selectedEdition.id)
    .order('full_name', { ascending: true })

  if (nomineesResult.error) {
    console.error(
      'nominee communication nominees',
      nomineesResult.error,
    )
    throw new Error('Unable to load nominees.')
  }

  const nominees = nomineesResult.data ?? []
  const nomineeIds = nominees.map(
    (nominee) => nominee.id,
  )
  const managedEventIds = selectedEvents
    .filter(
      (event) =>
        eventPermissions.get(event.id) === true,
    )
    .map((event) => event.id)

  const [announcementsResult, resourcesResult] =
    selectedEdition.can_manage_edition
      ? await Promise.all([
          admin
            .from('nominee_announcements')
            .select(
              'id,award_edition_id,title,body,priority,is_published,published_at,expires_at,created_at,updated_at',
            )
            .eq(
              'award_edition_id',
              selectedEdition.id,
            )
            .order('created_at', {
              ascending: false,
            }),
          admin
            .from('nominee_resources')
            .select(
              'id,award_edition_id,title,description,resource_type,original_filename,mime_type,file_size_bytes,is_published,published_at,expires_at,created_at,updated_at',
            )
            .eq(
              'award_edition_id',
              selectedEdition.id,
            )
            .order('created_at', {
              ascending: false,
            }),
        ])
      : [
          { data: [], error: null },
          { data: [], error: null },
        ]

  if (
    announcementsResult.error ||
    resourcesResult.error
  ) {
    console.error(
      'nominee communication content',
      announcementsResult.error ||
        resourcesResult.error,
    )
    throw new Error(
      'Unable to load nominee communication content.',
    )
  }

  const passesResult =
    nomineeIds.length && managedEventIds.length
      ? await admin
          .from('nominee_ceremony_passes')
          .select(
            'id,nominee_id,event_id,ticket_id,status,issued_at,revoked_at,revoke_reason',
          )
          .in('nominee_id', nomineeIds)
          .in('event_id', managedEventIds)
          .order('issued_at', {
            ascending: false,
          })
      : { data: [], error: null }

  if (passesResult.error) {
    console.error(
      'nominee communication passes',
      passesResult.error,
    )
    throw new Error('Unable to load ceremony passes.')
  }

  const nomineeMap = new Map(
    nominees.map((nominee) => [nominee.id, nominee]),
  )
  const eventMap = new Map(
    selectedEvents.map((event) => [
      event.id,
      event,
    ]),
  )

  return {
    editions: allowedEditions,
    selectedEdition,
    announcements: announcementsResult.data ?? [],
    resources: resourcesResult.data ?? [],
    nominees,
    events: selectedEvents.map((event) => ({
      ...event,
      can_issue_pass:
        eventPermissions.get(event.id) === true,
    })),
    passes: (passesResult.data ?? []).map((pass) => ({
      ...pass,
      nominee: nomineeMap.get(pass.nominee_id) ?? null,
      event: eventMap.get(pass.event_id) ?? null,
    })),
  }
}
