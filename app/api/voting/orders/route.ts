import crypto from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  createVultPaymentLink,
  isVultPaymentMethod,
  publicVultErrorMessage,
} from '@/lib/vult/client'

function clean(value: unknown, max = 200) {
  return String(value ?? '').trim().slice(0, max)
}

function makeOrderNumber(year: number) {
  return `VOTE-${year}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`
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

  const nomineeCode = clean(body.nominee_code, 64).toUpperCase()
  const quantity = Number(body.quantity)
  const buyerName = clean(body.buyer_name, 120)
  const buyerEmail = clean(body.buyer_email, 180).toLowerCase()
  const buyerPhone = clean(body.buyer_phone, 40)
  const paymentMethod = body.payment_method

  if (
    !nomineeCode ||
    !Number.isInteger(quantity) ||
    quantity <= 0 ||
    !buyerName ||
    (!buyerEmail && !buyerPhone) ||
    !isVultPaymentMethod(paymentMethod)
  ) {
    return NextResponse.json(
      {
        error:
          'Please provide a valid nominee, quantity, contact details and payment method.',
      },
      { status: 400 },
    )
  }

  const admin = createAdminClient()

  const { data: nominee } = await admin
    .from('nominees')
    .select(
      'id,award_edition_id,nominee_code,full_name,status,is_public',
    )
    .eq('nominee_code', nomineeCode)
    .maybeSingle()

  if (
    !nominee ||
    nominee.status !== 'published' ||
    nominee.is_public !== true
  ) {
    return NextResponse.json(
      { error: 'This nominee is not available for public voting.' },
      { status: 404 },
    )
  }

  const [{ data: edition }, { data: pricing }] =
    await Promise.all([
      admin
        .from('award_editions')
        .select(
          'id,year,status,is_public,voting_starts_at,voting_ends_at',
        )
        .eq('id', nominee.award_edition_id)
        .maybeSingle(),
      admin
        .from('vote_pricing')
        .select(
          'unit_price,currency,min_quantity,max_quantity,is_active',
        )
        .eq('award_edition_id', nominee.award_edition_id)
        .maybeSingle(),
    ])

  if (
    !edition ||
    edition.is_public !== true ||
    edition.status !== 'voting_open'
  ) {
    return NextResponse.json(
      { error: 'Voting is currently closed.' },
      { status: 409 },
    )
  }

  const now = Date.now()
  const starts = edition.voting_starts_at
    ? new Date(edition.voting_starts_at).getTime()
    : null
  const ends = edition.voting_ends_at
    ? new Date(edition.voting_ends_at).getTime()
    : null

  if (
    (starts !== null && now < starts) ||
    (ends !== null && now > ends)
  ) {
    return NextResponse.json(
      { error: 'Voting is outside the configured voting window.' },
      { status: 409 },
    )
  }

  if (!pricing?.is_active) {
    return NextResponse.json(
      { error: 'Vote pricing is not active.' },
      { status: 409 },
    )
  }

  if (
    quantity < pricing.min_quantity ||
    quantity > pricing.max_quantity
  ) {
    return NextResponse.json(
      {
        error: `Vote quantity must be between ${pricing.min_quantity} and ${pricing.max_quantity}.`,
      },
      { status: 400 },
    )
  }

  const unitPrice = Number(pricing.unit_price)
  const totalAmount = unitPrice * quantity
  const orderNumber = makeOrderNumber(edition.year)
  const publicToken = crypto.randomUUID()
  const expiresAt = new Date(
    Date.now() + 30 * 60 * 1000,
  ).toISOString()

  const { data: order, error: orderError } = await admin
    .from('vote_orders')
    .insert({
      order_number: orderNumber,
      public_token: publicToken,
      nominee_id: nominee.id,
      quantity,
      unit_price: unitPrice,
      currency: pricing.currency,
      buyer_name: buyerName,
      buyer_email: buyerEmail || null,
      buyer_phone: buyerPhone || null,
      status: 'pending',
      expires_at: expiresAt,
    })
    .select(
      'id,order_number,public_token,total_amount,currency',
    )
    .single()

  if (orderError || !order) {
    console.error('create vote order', orderError)

    return NextResponse.json(
      { error: 'Unable to create the vote order.' },
      { status: 500 },
    )
  }

  const { data: payment, error: paymentError } = await admin
    .from('payments')
    .insert({
      payment_type: 'vote',
      vote_order_id: order.id,
      provider: 'vult',
      idempotency_key: `vote:${order.id}`,
      amount: totalAmount,
      currency: pricing.currency,
      status: 'pending',
      payer_name: buyerName,
      payer_email: buyerEmail || null,
      payer_phone: buyerPhone || null,
      provider_payload: {
        integration_status: 'initializing',
        payment_method: paymentMethod,
      },
    })
    .select('id')
    .single()

  if (paymentError || !payment) {
    console.error('create vote payment', paymentError)

    await admin
      .from('vote_orders')
      .update({ status: 'cancelled' })
      .eq('id', order.id)

    return NextResponse.json(
      { error: 'Unable to initialize the vote payment.' },
      { status: 500 },
    )
  }

  try {
    const vult = await createVultPaymentLink({
      orderId: order.order_number,
      amount: Number(order.total_amount),
      currency: order.currency,
      paymentMethod,
    })

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
            initiated_at: new Date().toISOString(),
          },
          failure_reason: null,
        })
        .eq('id', payment.id),
      admin
        .from('vote_orders')
        .update({ status: 'payment_pending' })
        .eq('id', order.id),
    ])

    return NextResponse.json(
      {
        order_number: order.order_number,
        order_token: order.public_token,
        amount: order.total_amount,
        currency: order.currency,
        payment_status: 'processing',
        payment_url: vult.link,
        payment_code: vult.code,
        payment_method: paymentMethod,
        status_url: `/payment/vult/vote/${order.public_token}`,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error('Vult vote payment initialization failed', error)

    const safeMessage = publicVultErrorMessage(
      error,
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
          },
        })
        .eq('id', payment.id),
      admin
        .from('vote_orders')
        .update({ status: 'failed' })
        .eq('id', order.id),
    ])

    return NextResponse.json(
      { error: safeMessage },
      { status: 502 },
    )
  }
}
