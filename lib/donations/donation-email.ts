import { createAdminClient } from '@/lib/supabase/admin'
import { sendTransactionalEmail } from '@/lib/email/resend-rest'

function money(amount: unknown, currency: string) {
  const value = Number(amount ?? 0)
  const prefix = currency === 'SLE' ? 'NLe' : currency
  return `${prefix} ${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function methodLabel(value?: string | null) {
  if (value === 'in-app') return 'Vult App'
  if (value === 'momo') return 'Mobile Money'
  if (value === 'card') return 'Debit/Credit Card'
  return 'Electronic payment'
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

export async function deliverDonationReceiptEmail(
  donationId: string,
) {
  const admin = createAdminClient()

  const { data: donation, error } = await admin
    .from('donations')
    .select(
      `
      id,
      donation_number,
      donor_name,
      organisation_name,
      donor_type,
      donor_email,
      is_anonymous,
      amount,
      currency,
      status,
      paid_at,
      campaign:donation_campaigns(title,fund_type)
      `,
    )
    .eq('id', donationId)
    .maybeSingle()

  if (error || !donation) {
    throw error ?? new Error('Donation not found.')
  }

  if (
    donation.status !== 'succeeded' ||
    !donation.donor_email
  ) {
    return
  }

  const { data: payment } = await admin
    .from('payments')
    .select('provider_payload,provider_transaction_id')
    .eq('donation_id', donationId)
    .eq('status', 'succeeded')
    .order('paid_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const campaignRaw = donation.campaign as any
  const campaign = Array.isArray(campaignRaw)
    ? campaignRaw[0]
    : campaignRaw

  const donorDisplay =
    donation.is_anonymous
      ? 'Anonymous Donor'
      : donation.donor_type === 'organisation'
        ? donation.organisation_name ||
          donation.donor_name ||
          'Organisation Donor'
        : donation.donor_name || 'Donor'

  const paymentMethod =
    payment?.provider_payload &&
    typeof payment.provider_payload === 'object'
      ? String(
          (payment.provider_payload as any).payment_method ??
            'unknown',
        )
      : 'unknown'

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, '') ||
    'https://www.girlpikinforbetteh.org'

  const receiptUrl = `${siteUrl}/donate/receipt/${encodeURIComponent(
    String(
      (
        await admin
          .from('donations')
          .select('public_token')
          .eq('id', donationId)
          .single()
      ).data?.public_token ?? '',
    ),
  )}`

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#25171d;">
      <div style="padding:28px;background:#78133b;color:#fff;">
        <h1 style="margin:0;font-size:26px;">Thank you for your donation</h1>
        <p style="margin:10px 0 0;color:#f3c6d6;">
          Girl Pikin For Betteh Foundation
        </p>
      </div>
      <div style="padding:28px;border:1px solid #efdde5;border-top:0;">
        <p>Dear ${escapeHtml(donorDisplay)},</p>
        <p>
          We acknowledge receipt of your contribution to
          <strong>${escapeHtml(campaign?.title ?? 'Girl Pikin For Betteh Foundation')}</strong>.
          Your support helps the Foundation continue its programmes and mission.
        </p>
        <table style="width:100%;border-collapse:collapse;margin:24px 0;">
          <tr><td style="padding:8px 0;color:#6e5d65;">Donation reference</td><td style="padding:8px 0;text-align:right;font-weight:700;">${escapeHtml(donation.donation_number)}</td></tr>
          <tr><td style="padding:8px 0;color:#6e5d65;">Amount</td><td style="padding:8px 0;text-align:right;font-weight:700;">${money(donation.amount, donation.currency)}</td></tr>
          <tr><td style="padding:8px 0;color:#6e5d65;">Fund / campaign</td><td style="padding:8px 0;text-align:right;">${escapeHtml(campaign?.title ?? 'General Fund')}</td></tr>
          <tr><td style="padding:8px 0;color:#6e5d65;">Payment method</td><td style="padding:8px 0;text-align:right;">${escapeHtml(methodLabel(paymentMethod))}</td></tr>
          <tr><td style="padding:8px 0;color:#6e5d65;">Transaction reference</td><td style="padding:8px 0;text-align:right;">${escapeHtml(payment?.provider_transaction_id ?? '—')}</td></tr>
        </table>
        <p>
          <a href="${escapeHtml(receiptUrl)}" style="display:inline-block;background:#d81b60;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;">
            View donation acknowledgement
          </a>
        </p>
        <p style="margin-top:28px;color:#6e5d65;font-size:13px;">
          This is a donation acknowledgement and payment receipt. It does not
          make any representation that the contribution is tax-deductible.
        </p>
      </div>
    </div>
  `

  try {
    await sendTransactionalEmail({
      to: donation.donor_email,
      subject: `Donation received — ${escapeHtml(donation.donation_number)}`,
      html,
      idempotencyKey: `donation-receipt-${donation.id}`,
    })

    await admin
      .from('donations')
      .update({
        receipt_email_sent_at: new Date().toISOString(),
        receipt_email_error: null,
      })
      .eq('id', donation.id)
  } catch (sendError) {
    const message =
      sendError instanceof Error
        ? sendError.message
        : 'Unknown email error'

    await admin
      .from('donations')
      .update({
        receipt_email_error: message,
      })
      .eq('id', donation.id)

    throw sendError
  }
}
