import { timingSafeEqual } from 'node:crypto'

export type VultWebhookPayload = {
  orderId: string
  vultRequestId: string
  status: 'completed' | 'failed'
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left)
  const b = Buffer.from(right)

  return a.length === b.length && timingSafeEqual(a, b)
}

export function verifyVultWebhookAuthorization(
  authorizationHeader: string | null,
) {
  const username = process.env.VULT_WEBHOOK_USERNAME ?? ''
  const password = process.env.VULT_WEBHOOK_PASSWORD ?? ''

  if (!username || !password || !authorizationHeader) return false
  if (!authorizationHeader.startsWith('Basic ')) return false

  const supplied = authorizationHeader.slice(6).trim()
  const expected = Buffer.from(`${username}:${password}`).toString('base64')

  return safeEqual(supplied, expected)
}

export function parseVultWebhookPayload(
  value: unknown,
): VultWebhookPayload | null {
  if (!value || typeof value !== 'object') return null

  const body = value as Record<string, unknown>
  const orderId = String(body.orderId ?? '').trim()
  const vultRequestId = String(body.vultRequestId ?? '').trim()
  const status = String(body.status ?? '').trim()

  if (
    !orderId ||
    !vultRequestId ||
    (status !== 'completed' && status !== 'failed')
  ) {
    return null
  }

  return {
    orderId,
    vultRequestId,
    status,
  }
}
