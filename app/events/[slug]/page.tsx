import type { Metadata } from 'next'
import { PublicEventDetailLivePage } from '@/components/ticketing/live-ticketing'
import { getPublicEventBySlug } from '@/lib/ticketing/live-data'
import {
  compactDescription,
  publicMetadata,
} from '@/lib/seo/site'

type PageProps = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params
  const data = await getPublicEventBySlug(slug)

  if (!data) {
    return publicMetadata({
      title: 'Event',
      description:
        'Official Girl Pikin For Betteh Foundation event information.',
      path: `/events/${encodeURIComponent(slug)}`,
    })
  }

  return publicMetadata({
    title: data.event.title,
    description: compactDescription(
      data.event.summary || data.event.description,
      `Official event information for ${data.event.title}.`,
    ),
    path: `/events/${encodeURIComponent(data.event.slug)}`,
    image: data.event.cover_image_url,
  })
}

export default async function EventDetail({
  params,
}: PageProps) {
  const { slug } = await params
  return <PublicEventDetailLivePage slug={slug} />
}
