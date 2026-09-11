import {
  constants,
  createPrivateKey,
  createSign,
  type KeyObject,
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

function stripWrappingQuotes(value: string) {
  const trimmed = value.trim()

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim()
  }

  return trimmed
}

function normalizePem(value: string) {
  return stripWrappingQuotes(value)
    .replace(/\\n/g, '\n')
    .replace(/\r\n/g, '\n')
    .trim()
}

function validateRsa4096(key: KeyObject) {
  if (
    key.asymmetricKeyType !== 'rsa' &&
    key.asymmetricKeyType !== 'rsa-pss'
  ) {
    throw new VultConfigurationError(
      'INVALID_PRIVATE_KEY_TYPE',
      `Expected RSA private key, received ${key.asymmetricKeyType ?? 'unknown'}.`,
    )
  }

  const modulusLength = key.asymmetricKeyDetails?.modulusLength

  if (modulusLength && modulusLength < 4096) {
    throw new VultConfigurationError(
      'PRIVATE_KEY_TOO_SMALL',
      `Vult requires RSA-4096. Configured key is RSA-${modulusLength}.`,
    )
  }

  return key
}

function parsePemPrivateKey(pem: string) {
  if (pem.includes('BEGIN PUBLIC KEY')) {
    throw new VultConfigurationError(
      'PUBLIC_KEY_CONFIGURED',
      'A public key was configured where the Vult private signing key is required.',
    )
  }

  if (!pem.includes('PRIVATE KEY')) {
    throw new VultConfigurationError(
      'INVALID_PRIVATE_KEY_PEM',
      'Configured value does not contain a PEM private key.',
    )
  }

  try {
    return validateRsa4096(createPrivateKey(pem))
  } catch (error) {
    if (error instanceof VultConfigurationError) throw error

    throw new VultConfigurationError(
      'INVALID_PRIVATE_KEY',
      `Unable to parse the configured PEM private key: ${
        error instanceof Error ? error.message : 'unknown key error'
      }`,
    )
  }
}

function parseDerPrivateKey(buffer: Buffer) {
  const attempts: Array<'pkcs8' | 'pkcs1'> = ['pkcs8', 'pkcs1']

  for (const type of attempts) {
    try {
      const key = createPrivateKey({
        key: buffer,
        format: 'der',
        type,
      })

      return validateRsa4096(key)
    } catch {
      // Try next DER private-key encoding.
    }
  }

  throw new VultConfigurationError(
    'INVALID_PRIVATE_KEY_DER',
    'The Base64 value decoded successfully but is not a supported PKCS#8/PKCS#1 RSA private key.',
  )
}

function getPrivateKeyObject() {
  const rawPem = process.env.VULT_PRIVATE_KEY_PEM?.trim()
  const rawBase64 = process.env.VULT_PRIVATE_KEY_BASE64?.trim()

  if (rawPem) {
    return parsePemPrivateKey(normalizePem(rawPem))
  }

  if (!rawBase64) {
    throw new VultConfigurationError(
      'MISSING_PRIVATE_KEY',
      'Missing VULT_PRIVATE_KEY_BASE64 or VULT_PRIVATE_KEY_PEM.',
    )
  }

  const configured = stripWrappingQuotes(rawBase64)

  // Be forgiving if a raw PEM was accidentally pasted into the BASE64 field.
  if (configured.includes('PRIVATE KEY')) {
    return parsePemPrivateKey(normalizePem(configured))
  }

  const compact = configured.replace(/\s+/g, '')

  if (!/^[A-Za-z0-9+/=_-]+$/.test(compact)) {
    throw new VultConfigurationError(
      'INVALID_PRIVATE_KEY_BASE64',
      'VULT_PRIVATE_KEY_BASE64 contains characters that are not valid Base64.',
    )
  }

  let decoded: Buffer

  try {
    // Node accepts standard Base64. Convert URL-safe Base64 too, just in case.
    const normalized = compact
      .replace(/-/g, '+')
      .replace(/_/g, '/')

    decoded = Buffer.from(normalized, 'base64')
  } catch (error) {
    throw new VultConfigurationError(
      'INVALID_PRIVATE_KEY_BASE64',
      `VULT_PRIVATE_KEY_BASE64 could not be decoded: ${
        error instanceof Error ? error.message : 'unknown decode error'
      }`,
    )
  }

  if (!decoded.length) {
    throw new VultConfigurationError(
      'INVALID_PRIVATE_KEY_BASE64',
      'VULT_PRIVATE_KEY_BASE64 decoded to an empty value.',
    )
  }

  const decodedText = decoded.toString('utf8').trim()

  // Preferred Vercel format: Base64 of the complete private_key.pem file.
  if (decodedText.includes('PRIVATE KEY')) {
    return parsePemPrivateKey(normalizePem(decodedText))
  }

  if (decodedText.includes('PUBLIC KEY')) {
    throw new VultConfigurationError(
      'PUBLIC_KEY_CONFIGURED',
      'VULT_PRIVATE_KEY_BASE64 contains a public key. The server requires the matching private key.',
    )
  }

  // Also support Base64 of raw PKCS#8 / PKCS#1 DER bytes.
  return parseDerPrivateKey(decoded)
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
  const privateKey = getPrivateKeyObject()

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
    if (error instanceof VultConfigurationError) throw error

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

    if (error.code === 'MISSING_PRIVATE_KEY') {
      return 'The Vult private signing key is not configured on the server.'
    }

    if (error.code === 'PUBLIC_KEY_CONFIGURED') {
      return 'The Vult public key was configured on the server, but payment signing requires the matching private key.'
    }

    if (error.code === 'PRIVATE_KEY_TOO_SMALL') {
      return 'The configured Vult signing key is not RSA-4096.'
    }

    if (
      error.code === 'INVALID_PRIVATE_KEY_BASE64' ||
      error.code === 'INVALID_PRIVATE_KEY_PEM' ||
      error.code === 'INVALID_PRIVATE_KEY_DER' ||
      error.code === 'INVALID_PRIVATE_KEY_TYPE' ||
      error.code === 'INVALID_PRIVATE_KEY' ||
      error.code === 'SIGNING_FAILED'
    ) {
      return 'The Vult private signing key is present but its format is invalid.'
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
    const name = error instanceof Error ? error.name : ''

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
