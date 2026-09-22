import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  parseVultWebhookPayload,
  verifyVultWebhookAuthorization,
} from '../../../lib/vult/webhook'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('verifyVultWebhookAuthorization', () => {
  it('accepts the exact configured Basic authorization credentials', () => {
    vi.stubEnv('VULT_WEBHOOK_USERNAME', 'merchant-webhook')
    vi.stubEnv('VULT_WEBHOOK_PASSWORD', 'super-secret-password')

    const token = Buffer.from(
      'merchant-webhook:super-secret-password',
    ).toString('base64')

    expect(
      verifyVultWebhookAuthorization(`Basic ${token}`),
    ).toBe(true)
  })

  it('rejects an incorrect password', () => {
    vi.stubEnv('VULT_WEBHOOK_USERNAME', 'merchant-webhook')
    vi.stubEnv('VULT_WEBHOOK_PASSWORD', 'super-secret-password')

    const token = Buffer.from(
      'merchant-webhook:wrong-password',
    ).toString('base64')

    expect(
      verifyVultWebhookAuthorization(`Basic ${token}`),
    ).toBe(false)
  })

  it('rejects a missing authorization header', () => {
    vi.stubEnv('VULT_WEBHOOK_USERNAME', 'merchant-webhook')
    vi.stubEnv('VULT_WEBHOOK_PASSWORD', 'super-secret-password')

    expect(verifyVultWebhookAuthorization(null)).toBe(false)
  })

  it('rejects non-Basic authorization', () => {
    vi.stubEnv('VULT_WEBHOOK_USERNAME', 'merchant-webhook')
    vi.stubEnv('VULT_WEBHOOK_PASSWORD', 'super-secret-password')

    expect(
      verifyVultWebhookAuthorization('Bearer abc123'),
    ).toBe(false)
  })

  it('fails closed when webhook credentials are not configured', () => {
    vi.stubEnv('VULT_WEBHOOK_USERNAME', '')
    vi.stubEnv('VULT_WEBHOOK_PASSWORD', '')

    const token = Buffer.from('anything:anything').toString('base64')

    expect(
      verifyVultWebhookAuthorization(`Basic ${token}`),
    ).toBe(false)
  })
})

describe('parseVultWebhookPayload', () => {
  it('parses a valid completed webhook', () => {
    expect(
      parseVultWebhookPayload({
        orderId: ' VOTE-2026-ABC123 ',
        vultRequestId: ' req-001 ',
        status: 'completed',
      }),
    ).toEqual({
      orderId: 'VOTE-2026-ABC123',
      vultRequestId: 'req-001',
      status: 'completed',
    })
  })

  it('parses a valid failed webhook', () => {
    expect(
      parseVultWebhookPayload({
        orderId: 'TKT-2026-XYZ789',
        vultRequestId: 'req-002',
        status: 'failed',
      }),
    ).toEqual({
      orderId: 'TKT-2026-XYZ789',
      vultRequestId: 'req-002',
      status: 'failed',
    })
  })

  it('rejects missing orderId', () => {
    expect(
      parseVultWebhookPayload({
        vultRequestId: 'req-003',
        status: 'completed',
      }),
    ).toBeNull()
  })

  it('rejects missing vultRequestId', () => {
    expect(
      parseVultWebhookPayload({
        orderId: 'VOTE-2026-ABC123',
        status: 'completed',
      }),
    ).toBeNull()
  })

  it('rejects unsupported statuses instead of treating them as success', () => {
    expect(
      parseVultWebhookPayload({
        orderId: 'VOTE-2026-ABC123',
        vultRequestId: 'req-004',
        status: 'pending',
      }),
    ).toBeNull()
  })

  it('rejects non-object payloads', () => {
    expect(parseVultWebhookPayload(null)).toBeNull()
    expect(parseVultWebhookPayload('completed')).toBeNull()
    expect(parseVultWebhookPayload(123)).toBeNull()
  })
})
