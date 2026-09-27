import { publicMetadata } from '@/lib/seo/site'

export const metadata = publicMetadata({
  title: 'Contact',
  description: 'Contact Girl Pikin For Betteh Foundation using the official public contact information and enquiry form.',
  path: '/contact',
})

export default function PublicSectionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
