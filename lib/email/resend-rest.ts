type SendEmailInput = {
  to: string
  subject: string
  html: string
  idempotencyKey: string
}

function required(name: string) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is not configured.`)
  return value
}

export async function sendTransactionalEmail({
  to,
  subject,
  html,
  idempotencyKey,
}: SendEmailInput) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${required('RESEND_API_KEY')}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify({
      from: required('RESEND_FROM_EMAIL'),
      to: [to],
      subject,
      html,
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(15000),
  })

  const text = await response.text()
  let body: any = null

  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      body = { raw: text }
    }
  }

  if (!response.ok) {
    throw new Error(
      body?.message ||
        body?.error ||
        `Resend returned HTTP ${response.status}.`,
    )
  }

  return body as { id?: string }
}
