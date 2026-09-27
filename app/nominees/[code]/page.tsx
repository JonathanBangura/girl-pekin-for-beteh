import type { Metadata } from 'next'
import { PublicNomineeProfileLivePage } from '@/components/public/live-awards'
import { getPublicNomineeByCode } from '@/lib/public/live-awards-data'
import {
  compactDescription,
  publicMetadata,
} from '@/lib/seo/site'

type PageProps = {
  params: Promise<{ code: string }>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { code } = await params
  const nominee = await getPublicNomineeByCode(code)

  if (!nominee) {
    return publicMetadata({
      title: 'Nominee',
      description:
        'View published Girl Pikin For Betteh nominee information.',
      path: `/nominees/${encodeURIComponent(code)}`,
    })
  }

  return publicMetadata({
    title: nominee.full_name,
    description: compactDescription(
      nominee.bio,
      `${nominee.full_name} is a published nominee in ${nominee.category_name}.`,
    ),
    path: `/nominees/${encodeURIComponent(
      nominee.nominee_code,
    )}`,
    image: nominee.photo_url,
  })
}

export default async function NomineeProfilePage({
  params,
}: PageProps) {
  const { code } = await params
  return <PublicNomineeProfileLivePage code={code} />
}
