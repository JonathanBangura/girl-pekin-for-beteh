import { publicMetadata } from '@/lib/seo/site'

export const metadata = publicMetadata({
  title: 'Gallery',
  description: 'View published programme, award and event highlights from Girl Pikin For Betteh Foundation.',
  path: '/gallery',
})

export default function PublicSectionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
