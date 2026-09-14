import { requirePermission } from '@/lib/auth/guards'

function present(value?: string | null) {
  return Boolean(value && value.trim())
}

function mask(value?: string | null) {
  if (!value) return 'Not configured'
  const trimmed = value.trim()
  if (trimmed.length <= 6) return 'Configured'
  return `${trimmed.slice(0, 2)}••••${trimmed.slice(-4)}`
}

export async function getPlatformSettingsData() {
  await requirePermission(
    'settings.manage',
    '/admin/settings',
  )

  const vultEnv = process.env.VULT_ENV || 'stage'
  const appUrl =
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    null

  return {
    operationalDefaults: [
      {
        label: 'Organization',
        value: 'Girl Pikin For Betteh Foundation',
        note: 'Fixed platform identity',
      },
      {
        label: 'Timezone',
        value: 'Africa/Freetown',
        note: 'Operational date/time display',
      },
      {
        label: 'Default currency',
        value: 'SLE',
        note: 'Wallet/ticket/voting operations',
      },
    ],
    integrations: [
      {
        name: 'Supabase Public Client',
        configured:
          present(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
          present(
            process.env
              .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
          ),
        detail: present(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
        )
          ? 'URL + publishable key detected'
          : 'Missing public Supabase configuration',
      },
      {
        name: 'Supabase Server Admin',
        configured:
          present(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
          present(process.env.SUPABASE_SECRET_KEY),
        detail: present(process.env.SUPABASE_SECRET_KEY)
          ? 'Server-only secret key detected'
          : 'SUPABASE_SECRET_KEY missing',
      },
      {
        name: 'Vult Payment Gateway',
        configured:
          present(process.env.VULT_MERCHANT_ID) &&
          present(process.env.VULT_PRIVATE_KEY_BASE64),
        detail: `${vultEnv.toUpperCase()} · Merchant ${mask(
          process.env.VULT_MERCHANT_ID,
        )}`,
      },
      {
        name: 'Vult Webhook Authentication',
        configured:
          present(process.env.VULT_WEBHOOK_USERNAME) &&
          present(process.env.VULT_WEBHOOK_PASSWORD),
        detail: present(process.env.VULT_WEBHOOK_URL)
          ? `Webhook URL configured`
          : 'Webhook credentials checked; URL not configured',
      },
      {
        name: 'Resend Email',
        configured:
          present(process.env.RESEND_API_KEY) &&
          present(process.env.RESEND_FROM_EMAIL),
        detail:
          process.env.RESEND_FROM_EMAIL ||
          'Sender email not configured',
      },
      {
        name: 'Ticket QR Security',
        configured: present(
          process.env.TICKET_QR_SECRET,
        ),
        detail: present(process.env.TICKET_QR_SECRET)
          ? 'Server-only QR secret detected'
          : 'TICKET_QR_SECRET missing',
      },
      {
        name: 'Application URL',
        configured: present(appUrl),
        detail: appUrl || 'APP_URL / NEXT_PUBLIC_SITE_URL missing',
      },
    ],
    environment: {
      vultEnv,
      appUrl,
      webhookUrl:
        process.env.VULT_WEBHOOK_URL || null,
      inAppType:
        process.env.VULT_IN_APP_TYPE ||
        'in-app',
    },
  }
}
