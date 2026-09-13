import { createPublicClient } from '@/lib/supabase/public'

function toNumber(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

async function loadPublishedCertification(
  certification: {
    id: string
    award_edition_id: string
    award_name_snapshot: string
    award_slug_snapshot: string
    edition_label_snapshot: string
    year_snapshot: number
    published_at: string | null
  } | null,
) {
  if (!certification) return null

  const supabase = createPublicClient()

  const { data: entries, error } = await supabase
    .from('result_entries')
    .select(
      'id,category_id,nominee_id,category_name_snapshot,nominee_code_snapshot,nominee_name_snapshot,institution_snapshot,photo_url_snapshot,snapshot_votes,snapshot_rank,decision,decision_note',
    )
    .eq('certification_id', certification.id)
    .eq('decision', 'winner')
    .order('category_name_snapshot', { ascending: true })

  if (error) {
    console.error('public result entries', error)
    return null
  }

  if (!entries?.length) return null

  return {
    certification,
    award: {
      name: certification.award_name_snapshot,
      slug: certification.award_slug_snapshot,
    },
    edition: {
      id: certification.award_edition_id,
      edition_label: certification.edition_label_snapshot,
      year: certification.year_snapshot,
    },
    winners: entries.map((entry) => ({
      id: entry.id,
      category: {
        id: entry.category_id,
        name: entry.category_name_snapshot,
      },
      nominee: {
        id: entry.nominee_id,
        nominee_code: entry.nominee_code_snapshot,
        full_name: entry.nominee_name_snapshot,
        institution: entry.institution_snapshot,
        photo_url: entry.photo_url_snapshot,
      },
      certified_votes: toNumber(entry.snapshot_votes),
      snapshot_rank: toNumber(entry.snapshot_rank),
      decision_note: entry.decision_note,
    })),
  }
}

export async function getLatestPublishedResults() {
  const supabase = createPublicClient()

  const { data: certification } = await supabase
    .from('result_certifications')
    .select(
      'id,award_edition_id,award_name_snapshot,award_slug_snapshot,edition_label_snapshot,year_snapshot,published_at',
    )
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return loadPublishedCertification(certification)
}

export async function getPublishedResultsBySlug(
  slug: string,
) {
  const supabase = createPublicClient()

  const { data: certification } = await supabase
    .from('result_certifications')
    .select(
      'id,award_edition_id,award_name_snapshot,award_slug_snapshot,edition_label_snapshot,year_snapshot,published_at',
    )
    .eq('status', 'published')
    .eq('award_slug_snapshot', slug)
    .order('published_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (certification) {
    return loadPublishedCertification(certification)
  }

  const { data: event } = await supabase
    .from('events')
    .select('award_edition_id')
    .eq('slug', slug)
    .maybeSingle()

  if (!event?.award_edition_id) return null

  const { data: eventCertification } = await supabase
    .from('result_certifications')
    .select(
      'id,award_edition_id,award_name_snapshot,award_slug_snapshot,edition_label_snapshot,year_snapshot,published_at',
    )
    .eq('status', 'published')
    .eq('award_edition_id', event.award_edition_id)
    .maybeSingle()

  return loadPublishedCertification(eventCertification)
}
