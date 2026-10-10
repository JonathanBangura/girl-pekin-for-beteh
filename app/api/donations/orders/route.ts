import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  createVultPaymentLink,
  isVultPaymentMethod,
  publicVultErrorMessage,
} from '@/lib/vult/client'

function clean(value: unknown, max = 1000) {
  return String(value ?? '').trim().slice(0, max)
}

function donationErrorMessage(message?: string | null) {
  const value = message ?? ''

  if (value.includes('campaign is not currently available')) {
    return 'This donation fund is not currently accepting contributions.'
  }

  if (value.includes('below the campaign minimum')) {
    return 'The donation amount is below the minimum for this fund.'
  }

  if (value.includes('Donor name')) {
    return 'Please enter your name or choose anonymous donation.'
  }

  if (value.includes('Organisation name')) {
    return 'Please enter the organisation name or choose anonymous donation.'
  }

  if (value.includes('Donation amount')) {
    return 'Please enter a valid donation amount.'
  }

  if (value.includes('message is too long')) {
    return 'Please shorten your donation message.'
  }

  return 'Unable to create the donation. Please review the details and try again.'
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body.' },
      { status: 400 },
    )
  }

  const campaignId = clean(body.campaign_id, 80)
  const amount = Number(body.amount)
  const paymentMethod = body.payment_method
  const donorType =
    clean(body.donor_type, 30) === 'organisation'
      ? 'organisation'
      : 'individual'
  const donorName = clean(body.donor_name, 160)
  const organisationName = clean(
    body.organisation_name,
    180,
  )
  const donorEmail = clean(
    body.donor_email,
    180,
  ).toLowerCase()
  const donorPhone = clean(body.donor_phone, 40)
  const isAnonymous = body.is_anonymous === true
  const message = clean(body.message, 500)

  if (
    !campaignId ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    !isVultPaymentMethod(paymentMethod)
  ) {
    return NextResponse.json(
      {
        error:
          'Please provide a valid donation fund, amount and payment method.',
      },
      { status: 400 },
    )
  }

  if (
    !isAnonymous &&
    donorType === 'individual' &&
    !donorName
  ) {
    return NextResponse.json(
      { error: 'Please enter your name.' },
      { status: 400 },
    )
  }

  if (
    !isAnonymous &&
    donorType === 'organisation' &&
    !organisationName
  ) {
    return NextResponse.json(
      { error: 'Please enter the organisation name.' },
      { status: 400 },
    )
  }

  const admin = createAdminClient()

  const { data, error } = await admin.rpc(
    'create_donation_order',
    {
      p_campaign_id: campaignId,
      p_amount: amount,
      p_payment_method: paymentMethod,
      p_donor_type: donorType,
      p_donor_name: donorName || null,
      p_organisation_name: organisationName || null,
      p_donor_email: donorEmail || null,
      p_donor_phone: donorPhone || null,
      p_is_anonymous: isAnonymous,
      p_message: message || null,
    },
  )

  if (error || !data?.length) {
    console.error('create donation order', error)

    return NextResponse.json(
      {
        error: donationErrorMessage(error?.message),
      },
      { status: 409 },
    )
  }

  const donation = data[0]

  try {
    const vult = await createVultPaymentLink({
      orderId: donation.donation_number,
      amount: Number(donation.amount),
      currency: donation.currency,
      paymentMethod,
    })

    const initiatedAt = new Date().toISOString()

    const [paymentUpdate, donationUpdate] =
      await Promise.all([
        admin
          .from('payments')
          .update({
            status: 'processing',
            provider_payload: {
              integration_status: 'payment_link_created',
              payment_method: paymentMethod,
              api_type: vult.apiType,
              link: vult.link,
              code: vult.code,
              campaign_slug: donation.campaign_slug,
              initiated_at: initiatedAt,
            },
            failure_reason: null,
          })
          .eq('id', donation.payment_id),
        admin
          .from('donations')
          .update({
            status: 'payment_pending',
          })
          .eq('id', donation.donation_id),
      ])

    if (paymentUpdate.error || donationUpdate.error) {
      console.error('donation payment state update', {
        payment: paymentUpdate.error,
        donation: donationUpdate.error,
      })
    }

    return NextResponse.json(
      {
        donation_number: donation.donation_number,
        donation_token: donation.public_token,
        amount: donation.amount,
        currency: donation.currency,
        campaign: donation.campaign_title,
        payment_method: paymentMethod,
        payment_url: vult.link,
        payment_code: vult.code,
        status_url: `/payment/vult/donation/${donation.public_token}`,
      },
      { status: 201 },
    )
  } catch (paymentError) {
    console.error(
      'Vult donation payment initialization failed',
      paymentError,
    )

    const safeMessage = publicVultErrorMessage(
      paymentError,
      paymentMethod,
    )

    await Promise.all([
      admin
        .from('payments')
        .update({
          status: 'failed',
          failure_reason: safeMessage,
          provider_payload: {
            integration_status: 'payment_link_failed',
            payment_method: paymentMethod,
            campaign_slug: donation.campaign_slug,
          },
        })
        .eq('id', donation.payment_id),
      admin
        .from('donations')
        .update({
          status: 'failed',
        })
        .eq('id', donation.donation_id),
    ])

    return NextResponse.json(
      { error: safeMessage },
      { status: 502 },
    )
  }
}
