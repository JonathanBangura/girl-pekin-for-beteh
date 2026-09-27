import { publicMetadata } from '@/lib/seo/site'

export const metadata = publicMetadata({
  title: 'Events',
  description: 'Explore official Girl Pikin For Betteh Foundation events, ticketing and public participation opportunities.',
  path: '/events',
})

export default function PublicSectionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
