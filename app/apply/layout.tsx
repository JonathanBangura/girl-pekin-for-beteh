import { publicMetadata } from '@/lib/seo/site'

export const metadata = publicMetadata({
  title: 'Apply or Nominate',
  description: 'Apply for yourself or nominate a Girl Pikin for an award category currently accepting public applications.',
  path: '/apply',
})

export default function PublicSectionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
