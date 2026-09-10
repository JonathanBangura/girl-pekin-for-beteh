import {
  constants,
  createSign,
} from 'node:crypto'

export type VultPaymentMethod = 'in-app' | 'card' | 'momo'
type VultApiPaymentType = VultPaymentMethod | 'vult'

type CreatePaymentLinkInput = {
  orderId: string
  amount: number
  currency: string
  paymentMethod: VultPaymentMethod
}

export type VultPaymentLink = {
  link: string | null
  code: string | null
  paymentMethod: VultPaymentMethod
  apiType: VultApiPaymentType
}

export class VultApiError extends Error {
  status: number
  body: unknown

  constructor(message: string, status: number, body: unknown) {
    super(message)
    this.name = 'VultApiError'
    this.status = status
    this.body = body
  }
}

function required(name: string) {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(`Missing required Vult environment variable: ${name}`)
  }

  return value
}

function getPrivateKey() {
  const encoded = process.env.VULT_PRIVATE_KEY_BASE64?.trim()

  if (encoded) {
    return Buffer.from(encoded, 'base64').toString('utf8')
  }

  const pem = process.env.VULT_PRIVATE_KEY_PEM

  if (pem?.trim()) {
    return pem.replace(/\\n/g, '\n')
  }

  throw new Error(
    'Missing VULT_PRIVATE_KEY_BASE64 or VULT_PRIVATE_KEY_PEM.',
  )
}

function getBaseUrl() {
  const explicit = process.env.VULT_API_BASE_URL?.trim()

  if (explicit) {
    return explicit.replace(/\/+$/, '')
  }

  return process.env.VULT_ENV === 'prod'
    ? 'https://wallet.vultme.io/api'
    : 'https://stage.vultme.io/api'
}

function getApiPaymentType(
  paymentMethod: VultPaymentMethod,
): VultApiPaymentType {
  if (paymentMethod !== 'in-app') return paymentMethod

  // The supplied OpenAPI schema calls this "in-app", while the supplied
  // JavaScript signing example uses "vult". Keep it configurable so the
  // merchant can match the environment actually enabled by Vult.
  const configured = process.env.VULT_IN_APP_TYPE?.trim()

  return configured === 'vult' ? 'vult' : 'in-app'
}

function stringifyAmount(amount: number) {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error('Invalid Vult payment amount.')
  }

  return amount.toFixed(2).replace(/\.00$/, '')
}

function signRequestBody(bodyText: string) {
  const signer = createSign('RSA-SHA512')
  signer.update(bodyText)
  signer.end()

  return signer.sign(
    {
      key: getPrivateKey(),
      padding: constants.RSA_PKCS1_PSS_PADDING,
      saltLength: constants.RSA_PSS_SALTLEN_DIGEST,
    },
    'base64',
  )
}

function errorCode(body: any): string | null {
  return (
    body?.code ||
    body?.error?.code ||
    body?.errors?.[0]?.code ||
    body?.errors?.[0]?.errorCode ||
    null
  )
}

export function publicVultErrorMessage(
  error: unknown,
  paymentMethod?: VultPaymentMethod,
) {
  if (!(error instanceof VultApiError)) {
    return 'Vult payment could not be initialized. Please try again.'
  }

  const code = errorCode(error.body)

  if (code === 'ORDER_ALREADY_COMPLETED') {
    return 'This order has already been completed.'
  }

  if (code === 'CURRENCY_NOT_AVAILABLE_FOR_ORDER') {
    return 'This currency is not configured for the Vult merchant.'
  }

  if (code === 'INVALID_FIELD' && paymentMethod === 'card') {
    return 'Card payment is not currently available for this merchant. Please choose another Vult payment method.'
  }

  if (code === 'INVALID_FIELD' && paymentMethod === 'in-app') {
    return 'Vult App payment is not currently available with this merchant configuration.'
  }

  return 'Vult could not create the payment request. Please try again or choose another payment method.'
}

export function isVultPaymentMethod(
  value: unknown,
): value is VultPaymentMethod {
  return value === 'in-app' || value === 'card' || value === 'momo'
}

export async function createVultPaymentLink({
  orderId,
  amount,
  currency,
  paymentMethod,
}: CreatePaymentLinkInput): Promise<VultPaymentLink> {
  const apiType = getApiPaymentType(paymentMethod)

  const requestBody = {
    merchantId: required('VULT_MERCHANT_ID'),
    type: apiType,
    payload: {
      orderId,
      amount: stringifyAmount(amount),
      currency,
    },
  }

  // Sign and send exactly the same serialized bytes.
  const bodyText = JSON.stringify(requestBody)
  const signature = signRequestBody(bodyText)

  const response = await fetch(
    `${getBaseUrl()}/merchants/private/v1/payment-links`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'X-Vult-Merchant-Signature': signature,
      },
      body: bodyText,
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    },
  )

  const raw = await response.text()
  let body: any = null

  if (raw) {
    try {
      body = JSON.parse(raw)
    } catch {
      body = { raw }
    }
  }

  if (!response.ok) {
    throw new VultApiError(
      `Vult payment-link request failed with HTTP ${response.status}.`,
      response.status,
      body,
    )
  }

  const data = body?.data

  if (!data || (!data.link && !data.code)) {
    throw new VultApiError(
      'Vult response did not contain a payment link or code.',
      response.status,
      body,
    )
  }

  return {
    link: typeof data.link === 'string' ? data.link : null,
    code: typeof data.code === 'string' ? data.code : null,
    paymentMethod,
    apiType,
  }
}
