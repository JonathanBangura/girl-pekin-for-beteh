'use client'

import { AdminPage } from '@/components/portal/admin-pages'

export function AdminModule({ title }: { title: string; eyebrow?: string }) {
  return <AdminPage section={title}/>
}
