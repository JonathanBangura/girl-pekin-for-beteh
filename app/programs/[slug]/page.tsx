import type { Metadata } from 'next'
import { ProgramDetailLivePage } from '@/components/public/cms-pages'
import { getPublishedProgramBySlug } from '@/lib/public/cms-data'
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
  const program = await getPublishedProgramBySlug(slug)

  if (!program) {
    return publicMetadata({
      title: 'Program',
      description:
        'Explore programmes from Girl Pikin For Betteh Foundation.',
      path: `/programs/${encodeURIComponent(slug)}`,
    })
  }

  return publicMetadata({
    title: program.title,
    description: compactDescription(
      program.summary || program.body,
      `Learn about ${program.title} from Girl Pikin For Betteh Foundation.`,
    ),
    path: `/programs/${encodeURIComponent(program.slug)}`,
    image: program.cover_image_url,
  })
}

export default async function ProgramPage({
  params,
}: PageProps) {
  const { slug } = await params
  return <ProgramDetailLivePage slug={slug} />
}
