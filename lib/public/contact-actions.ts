'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim()
}

export async function submitPublicContactForm(
  formData: FormData,
) {
  const honeypot = text(formData, 'company_website')

  if (honeypot) {
    redirect('/contact?sent=1')
  }

  const name = text(formData, 'name')
  const email = text(formData, 'email').toLowerCase()
  const phone = text(formData, 'phone')
  const subject = text(formData, 'subject')
  const message = text(formData, 'message')

  if (
    name.length < 2 ||
    name.length > 180 ||
    !email.includes('@') ||
    email.length > 254 ||
    phone.length > 80 ||
    subject.length > 250 ||
    message.length < 5 ||
    message.length > 5000
  ) {
    redirect('/contact?error=invalid_form')
  }

  const admin = createAdminClient()

  const { error } = await admin
    .from('contact_submissions')
    .insert({
      name,
      email,
      phone: phone || null,
      subject: subject || null,
      message,
      status: 'new',
    })

  if (error) {
    console.error('public contact submission', error)
    redirect('/contact?error=submit_failed')
  }

  revalidatePath('/admin/content')
  redirect('/contact?sent=1')
}
