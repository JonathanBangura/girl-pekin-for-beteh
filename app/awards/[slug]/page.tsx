import type { Metadata } from 'next'
import { PublicAwardEditionLivePage } from '@/components/public/live-awards'
import { getPublicAwardEditionBySlug } from '@/lib/public/live-awards-data'
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
  const data = await getPublicAwardEditionBySlug(slug)

  if (!data) {
    return publicMetadata({
      title: 'Award',
      description:
        'Official Girl Pikin For Betteh award information.',
      path: `/awards/${encodeURIComponent(slug)}`,
    })
  }

  return publicMetadata({
    title: `${data.award.name} — ${data.edition.edition_label}`,
    description: compactDescription(
      data.edition.description ||
        data.award.summary ||
        data.award.description,
      `Explore ${data.award.name}, ${data.edition.edition_label}.`,
    ),
    path: `/awards/${encodeURIComponent(slug)}`,
    image: data.event?.cover_image_url,
  })
}

export default async function Page({
  params,
}: PageProps) {
  const { slug } = await params
  return <PublicAwardEditionLivePage slug={slug} />
}
