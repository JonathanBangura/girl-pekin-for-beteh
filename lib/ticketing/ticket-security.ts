import { createHash, createHmac } from 'node:crypto'

function getQrSecret() {
  const raw = process.env.TICKET_QR_SECRET?.trim()
  if (!raw) throw new Error('TICKET_QR_SECRET is not configured.')

  let key = Buffer.from(raw, 'base64')
  if (key.length < 32) key = Buffer.from(raw, 'utf8')

  if (key.length < 32) {
    throw new Error('TICKET_QR_SECRET must contain at least 32 bytes.')
  }

  return key
}

export function makeTicketToken(ticketId: string) {
  const mac = createHmac('sha256', getQrSecret())
    .update(`gpfb-ticket:v1:${ticketId}`)
    .digest('base64url')

  return `${ticketId}.${mac}`
}

export function hashTicketToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export function makeTicketQrPayload(token: string) {
  return `GPFB:TICKET:${token}`
}
