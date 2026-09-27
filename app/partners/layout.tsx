import { publicMetadata } from '@/lib/seo/site'

export const metadata = publicMetadata({
  title: 'Partners',
  description: 'View published partners and supporters of Girl Pikin For Betteh Foundation.',
  path: '/partners',
})

export default function PublicSectionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
