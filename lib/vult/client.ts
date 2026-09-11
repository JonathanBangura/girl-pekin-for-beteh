import {
  constants,
  createPrivateKey,
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

export class VultConfigurationError extends Error {
  code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'VultConfigurationError'
    this.code = code
  }
}

export class VultTransportError extends Error {
  code: string
  cause?: unknown

  constructor(code: string, message: string, cause?: unknown) {
    super(message)
    this.name = 'VultTransportError'
    this.code = code
    this.cause = cause
  }
}

function required(name: string) {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new VultConfigurationError(
      `MISSING_${name}`,
      `Missing required Vult environment variable: ${name}`,
    )
  }

  return value
}

function getPrivateKey() {
  const encoded = process.env.VULT_PRIVATE_KEY_BASE64?.trim()
  const pem = process.env.VULT_PRIVATE_KEY_PEM?.trim()

  let privateKeyPem = ''

  if (encoded) {
    try {
      privateKeyPem = Buffer.from(encoded, 'base64').toString('utf8')
    } catch (error) {
      throw new VultConfigurationError(
        'INVALID_PRIVATE_KEY_BASE64',
        `VULT_PRIVATE_KEY_BASE64 could not be decoded: ${
          error instanceof Error ? error.message : 'unknown decode error'
        }`,
      )
    }
  } else if (pem) {
    privateKeyPem = pem.replace(/\\n/g, '\n')
  } else {
    throw new VultConfigurationError(
      'MISSING_PRIVATE_KEY',
      'Missing VULT_PRIVATE_KEY_BASE64 or VULT_PRIVATE_KEY_PEM.',
    )
  }

  if (
    !privateKeyPem.includes('PRIVATE KEY') ||
    privateKeyPem.includes('PUBLIC KEY')
  ) {
    throw new VultConfigurationError(
      'INVALID_PRIVATE_KEY_PEM',
      'The configured Vult signing key is not a private PEM key.',
    )
  }

  try {
    const key = createPrivateKey(privateKeyPem)

    if (
      key.asymmetricKeyType !== 'rsa' &&
      key.asymmetricKeyType !== 'rsa-pss'
    ) {
      throw new Error(
        `Expected RSA private key, received ${key.asymmetricKeyType ?? 'unknown'}.`,
      )
    }

    const modulusLength = key.asymmetricKeyDetails?.modulusLength

    if (modulusLength && modulusLength < 4096) {
      throw new Error(
        `Expected RSA-4096 key, received RSA-${modulusLength}.`,
      )
    }
  } catch (error) {
    throw new VultConfigurationError(
      'INVALID_PRIVATE_KEY',
      `The configured Vult private key cannot be used for RSA signing: ${
        error instanceof Error ? error.message : 'unknown key error'
      }`,
    )
  }

  return privateKeyPem
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

  const configured = process.env.VULT_IN_APP_TYPE?.trim()

  return configured === 'vult' ? 'vult' : 'in-app'
}

function stringifyAmount(amount: number) {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new VultConfigurationError(
      'INVALID_AMOUNT',
      'Invalid Vult payment amount.',
    )
  }

  return amount.toFixed(2).replace(/\.00$/, '')
}

function signRequestBody(bodyText: string) {
  const privateKey = getPrivateKey()

  try {
    const signer = createSign('RSA-SHA512')
    signer.update(bodyText)
    signer.end()

    return signer.sign(
      {
        key: privateKey,
        padding: constants.RSA_PKCS1_PSS_PADDING,
        saltLength: constants.RSA_PSS_SALTLEN_DIGEST,
      },
      'base64',
    )
  } catch (error) {
    throw new VultConfigurationError(
      'SIGNING_FAILED',
      `Unable to sign the Vult payment request: ${
        error instanceof Error ? error.message : 'unknown signing error'
      }`,
    )
  }
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
  if (error instanceof VultConfigurationError) {
    if (error.code === 'MISSING_VULT_MERCHANT_ID') {
      return 'Vult Merchant ID is not configured on the server.'
    }

    if (
      error.code === 'MISSING_PRIVATE_KEY' ||
      error.code === 'INVALID_PRIVATE_KEY_BASE64' ||
      error.code === 'INVALID_PRIVATE_KEY_PEM' ||
      error.code === 'INVALID_PRIVATE_KEY' ||
      error.code === 'SIGNING_FAILED'
    ) {
      return 'The Vult RSA signing key is missing or invalid on the server.'
    }

    return 'The Vult payment configuration is incomplete.'
  }

  if (error instanceof VultTransportError) {
    if (error.code === 'TIMEOUT') {
      return 'The Vult payment service timed out. Please try again.'
    }

    return 'The server could not reach the Vult payment service. Please try again.'
  }

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

  if (error.status === 401 || error.status === 403) {
    return 'Vult rejected the merchant authentication or request signature.'
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

  const bodyText = JSON.stringify(requestBody)
  const signature = signRequestBody(bodyText)

  let response: Response

  try {
    response = await fetch(
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
  } catch (error) {
    const name =
      error instanceof Error ? error.name : ''

    if (
      name === 'AbortError' ||
      name === 'TimeoutError'
    ) {
      throw new VultTransportError(
        'TIMEOUT',
        'Vult payment-link request timed out.',
        error,
      )
    }

    throw new VultTransportError(
      'NETWORK',
      `Unable to reach the Vult payment-link endpoint: ${
        error instanceof Error ? error.message : 'unknown network error'
      }`,
      error,
    )
  }

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
