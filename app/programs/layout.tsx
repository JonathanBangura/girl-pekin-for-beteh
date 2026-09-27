import { publicMetadata } from '@/lib/seo/site'

export const metadata = publicMetadata({
  title: 'Programs',
  description: 'Explore programmes and initiatives delivered by Girl Pikin For Betteh Foundation.',
  path: '/programs',
})

export default function PublicSectionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
