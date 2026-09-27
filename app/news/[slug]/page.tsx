import type { Metadata } from 'next'
import { NewsDetailLivePage } from '@/components/public/cms-pages'
import { getPublishedNewsBySlug } from '@/lib/public/cms-data'
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
  const post = await getPublishedNewsBySlug(slug)

  if (!post) {
    return publicMetadata({
      title: 'News',
      description:
        'Official news and updates from Girl Pikin For Betteh Foundation.',
      path: `/news/${encodeURIComponent(slug)}`,
    })
  }

  return publicMetadata({
    title: post.title,
    description: compactDescription(
      post.excerpt || post.body,
      `Official update from Girl Pikin For Betteh Foundation: ${post.title}.`,
    ),
    path: `/news/${encodeURIComponent(post.slug)}`,
    image: post.cover_image_url,
  })
}

export default async function NewsPage({
  params,
}: PageProps) {
  const { slug } = await params
  return <NewsDetailLivePage slug={slug} />
}
