import { privateMetadata } from '@/lib/seo/site'

export const metadata = privateMetadata

export default function PrivateLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
