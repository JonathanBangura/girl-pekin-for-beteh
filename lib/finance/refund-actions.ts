'use server'

import { redirect } from 'next/navigation'
import { requirePermission } from '@/lib/auth/guards'

export async function recordExternalFullRefund(
  _formData: FormData,
) {
  await requirePermission(
    'finance.manage',
    '/admin/finance',
  )

  redirect('/admin/finance/reports')
}
