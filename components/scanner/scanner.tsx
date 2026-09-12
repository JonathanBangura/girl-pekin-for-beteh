'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Clock3,
  RefreshCw,
  Search,
  ShieldAlert,
  TicketCheck,
  XCircle,
} from 'lucide-react'
import { BrowserQRCodeReader } from '@zxing/browser'
import { Brand } from '@/components/brand/brand'
import { Pill } from '@/components/public/public'

type EventRow = {
  id: string
  title: string
  slug: string
  venue: string | null
  starts_at: string | null
  status: string
}

type RecentCheckin = {
  id: number
  checked_in_at: string
  device_label: string | null
  ticket_code: string
  holder_name: string | null
  ticket_type_name: string
}

type Summary = {
  issued: number
  active: number
  checkedIn: number
  remaining: number
  recent: RecentCheckin[]
}

type ScanResult = {
  result_code: string
  result_message: string
  ticket_id: string | null
  ticket_code: string | null
  ticket_status: string | null
  holder_name: string | null
  ticket_type_name: string | null
  order_number: string | null
  checked_in_at: string | null
}

function formatTime(value?: string | null) {
  if (!value) return '—'

  return new Intl.DateTimeFormat('en-SL', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function formatEventDate(value?: string | null) {
  if (!value) return 'Date to be confirmed'

  return new Intl.DateTimeFormat('en-SL', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

const resultPresentation: Record<
  string,
  {
    label: string
    title: string
    tone: 'teal' | 'gold' | 'coral'
    className: string
  }
> = {
  checked_in: {
    label: 'CHECKED IN',
    title: 'Guest may enter',
    tone: 'teal',
    className: 'valid',
  },
  already_used: {
    label: 'ALREADY USED',
    title: 'Ticket already checked in',
    tone: 'gold',
    className: 'used',
  },
  wrong_event: {
    label: 'WRONG EVENT',
    title: 'Do not admit this ticket',
    tone: 'coral',
    className: 'invalid',
  },
  cancelled: {
    label: 'CANCELLED',
    title: 'Do not admit this ticket',
    tone: 'coral',
    className: 'cancelled',
  },
  refunded: {
    label: 'REFUNDED',
    title: 'Do not admit this ticket',
    tone: 'coral',
    className: 'cancelled',
  },
  reissued: {
    label: 'REPLACED TICKET',
    title: 'Use the newer ticket',
    tone: 'coral',
    className: 'cancelled',
  },
  unpaid: {
    label: 'PAYMENT NOT CONFIRMED',
    title: 'Do not admit this ticket',
    tone: 'coral',
    className: 'unpaid',
  },
  event_unavailable: {
    label: 'CHECK-IN CLOSED',
    title: 'This event is not open for check-in',
    tone: 'coral',
    className: 'invalid',
  },
  invalid: {
    label: 'INVALID TICKET',
    title: 'Do not admit this ticket',
    tone: 'coral',
    className: 'invalid',
  },
}

export function Scanner({
  events,
  initialSummary,
  canViewAdminCheckins,
}: {
  events: EventRow[]
  initialSummary: Summary | null
  canViewAdminCheckins: boolean
}) {
  const [eventId, setEventId] = useState(events[0]?.id ?? '')
  const [summary, setSummary] = useState<Summary | null>(initialSummary)
  const [lookup, setLookup] = useState('')
  const [deviceLabel, setDeviceLabel] = useState('')
  const [result, setResult] = useState<ScanResult | null>(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [busy, setBusy] = useState(false)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const controlsRef = useRef<{ stop: () => void } | null>(null)
  const scanLockRef = useRef(false)

  const selectedEvent = events.find((event) => event.id === eventId) ?? null

  useEffect(() => {
    const saved = window.localStorage.getItem('gpfb-checkin-device')
    if (saved) setDeviceLabel(saved)
  }, [])

  useEffect(() => {
    return () => {
      controlsRef.current?.stop()
    }
  }, [])

  async function refreshSummary(nextEventId = eventId) {
    if (!nextEventId) return

    const response = await fetch(
      `/api/checkin/summary?event_id=${encodeURIComponent(nextEventId)}`,
      { cache: 'no-store' },
    )

    if (!response.ok) return

    setSummary(await response.json())
  }

  async function onEventChange(nextEventId: string) {
    controlsRef.current?.stop()
    controlsRef.current = null
    setCameraActive(false)
    setResult(null)
    setLookup('')
    setEventId(nextEventId)
    setSummary(null)
    await refreshSummary(nextEventId)
  }

  function saveDeviceLabel(value: string) {
    setDeviceLabel(value)
    window.localStorage.setItem('gpfb-checkin-device', value)
  }

  async function submitCredential(input: {
    qr_payload?: string
    ticket_code?: string
  }) {
    if (!eventId || busy || scanLockRef.current) return

    scanLockRef.current = true
    setBusy(true)
    setCameraError('')

    try {
      const response = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          event_id: eventId,
          qr_payload: input.qr_payload ?? null,
          ticket_code: input.ticket_code ?? null,
          device_label: deviceLabel || null,
        }),
      })

      const body = await response.json().catch(() => ({}))

      if (!response.ok) {
        setResult({
          result_code: 'invalid',
          result_message: body.error || 'Ticket validation failed.',
          ticket_id: null,
          ticket_code: null,
          ticket_status: null,
          holder_name: null,
          ticket_type_name: null,
          order_number: null,
          checked_in_at: null,
        })
      } else {
        setResult(body)
      }

      controlsRef.current?.stop()
      controlsRef.current = null
      setCameraActive(false)
      await refreshSummary()
    } finally {
      setBusy(false)
      window.setTimeout(() => {
        scanLockRef.current = false
      }, 350)
    }
  }

  async function startCamera() {
    if (!eventId || !videoRef.current || cameraActive) return

    setResult(null)
    setCameraError('')
    scanLockRef.current = false

    try {
      const reader = new BrowserQRCodeReader()
      const controls = await reader.decodeFromConstraints(
        {
          audio: false,
          video: {
            facingMode: { ideal: 'environment' },
          },
        },
        videoRef.current,
        (decoded) => {
          if (!decoded || scanLockRef.current) return
          void submitCredential({ qr_payload: decoded.getText() })
        },
      )

      controlsRef.current = controls
      setCameraActive(true)
    } catch (error) {
      console.error('camera start failed', error)
      setCameraError(
        'Camera could not start. Allow camera access or use the ticket-code fallback below.',
      )
      setCameraActive(false)
    }
  }

  function stopCamera() {
    controlsRef.current?.stop()
    controlsRef.current = null
    setCameraActive(false)
  }

  async function manualLookup() {
    const code = lookup.trim()
    if (!code) return
    await submitCredential({ ticket_code: code })
  }

  function scanNext() {
    setResult(null)
    setLookup('')
    scanLockRef.current = false
  }

  const presentation = result
    ? resultPresentation[result.result_code] ?? resultPresentation.invalid
    : null

  const ResultIcon = result
    ? result.result_code === 'checked_in'
      ? CheckCircle2
      : result.result_code === 'already_used'
        ? Clock3
        : result.result_code === 'unpaid'
          ? AlertTriangle
          : result.result_code === 'cancelled' ||
              result.result_code === 'refunded' ||
              result.result_code === 'reissued'
            ? ShieldAlert
            : XCircle
    : null

  if (!events.length) {
    return (
      <main className="scanner professional-scanner live-scanner">
        <header>
          <Link href="/"><Brand /></Link>
          <div className="scanner-header-status">
            <span className="live-indicator" /> Secure event check-in
          </div>
        </header>

        <div className="scanner-body">
          <section className="scanner-no-events">
            <ShieldAlert size={34} />
            <h1>No check-in event available</h1>
            <p>
              Your account is not assigned to a published or sales-closed
              event. Ask an administrator to assign check-in access.
            </p>
          </section>
        </div>
      </main>
    )
  }

  return (
    <main className="scanner professional-scanner live-scanner">
      <header>
        <Link href="/"><Brand /></Link>
        <div className="scanner-header-status">
          <span className="live-indicator" /> Live event check-in
        </div>
      </header>

      <div className="scanner-body">
        <div className="scanner-heading live-scanner-heading">
          <Pill tone="gold">Event Operations</Pill>
          <h1>Ticket check-in</h1>
          <p>
            Scan an individual QR ticket or enter the ticket code manually.
          </p>
        </div>

        <section className="scanner-event-control">
          <label>
            Event
            <select
              value={eventId}
              onChange={(event) => void onEventChange(event.target.value)}
            >
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.title}
                </option>
              ))}
            </select>
          </label>

          <label>
            Check-in station
            <input
              value={deviceLabel}
              onChange={(event) => saveDeviceLabel(event.target.value)}
              placeholder="e.g. Main Gate 1"
            />
          </label>

          <div className="scanner-event-meta">
            <strong>{selectedEvent?.title}</strong>
            <span>{formatEventDate(selectedEvent?.starts_at)}</span>
            <small>{selectedEvent?.venue || 'Venue not set'}</small>
          </div>
        </section>

        <section className="scanner-live-stats">
          <article>
            <span>Issued</span>
            <strong>{summary?.issued ?? 0}</strong>
          </article>
          <article>
            <span>Checked in</span>
            <strong>{summary?.checkedIn ?? 0}</strong>
          </article>
          <article>
            <span>Remaining</span>
            <strong>{summary?.remaining ?? 0}</strong>
          </article>
        </section>

        <section className="scanner-workspace live-scanner-workspace">
          <div className="scan-frame professional-scan-frame live-camera-frame">
            <video
              ref={videoRef}
              playsInline
              muted
              className={cameraActive ? 'active' : ''}
            />

            {!cameraActive && (
              <div className="scanner-camera-placeholder">
                <Camera size={38} />
                <strong>Ready to scan QR ticket</strong>
                <small>Rear camera is used when available.</small>
              </div>
            )}

            <i /><i /><i /><i />
          </div>

          {cameraError && (
            <div className="live-form-message error">
              {cameraError}
            </div>
          )}

          <div className="scanner-camera-actions">
            {!cameraActive ? (
              <button
                className="button"
                type="button"
                onClick={() => void startCamera()}
                disabled={busy}
              >
                <Camera size={17} /> Start Camera
              </button>
            ) : (
              <button
                className="button secondary"
                type="button"
                onClick={stopCamera}
              >
                Stop Camera
              </button>
            )}
          </div>

          <div className="scanner-divider">
            <span>or enter ticket code</span>
          </div>

          <div className="manual professional-manual live-manual-checkin">
            <div className="scanner-search-field">
              <Search size={17} />
              <input
                aria-label="Ticket code"
                value={lookup}
                onChange={(event) => setLookup(event.target.value)}
                placeholder="TKT-26-..."
                autoCapitalize="characters"
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    void manualLookup()
                  }
                }}
              />
            </div>

            <button
              className="button"
              type="button"
              disabled={!lookup.trim() || busy}
              onClick={() => void manualLookup()}
            >
              {busy ? 'Checking…' : 'Validate & Check In'}
            </button>
          </div>
        </section>

        {result && presentation && ResultIcon && (
          <section className={`scan-result ${presentation.className} live-scan-result`}>
            <div className="result-icon">
              <ResultIcon size={30} />
            </div>

            <Pill tone={presentation.tone}>
              {presentation.label}
            </Pill>

            <h2>{presentation.title}</h2>
            <p className="scan-result-message">{result.result_message}</p>

            {result.ticket_code && (
              <div className="scan-detail-grid">
                <div>
                  <span>Guest</span>
                  <strong>{result.holder_name || 'Guest'}</strong>
                </div>
                <div>
                  <span>Ticket tier</span>
                  <strong>{result.ticket_type_name || 'Event Ticket'}</strong>
                </div>
                <div>
                  <span>Ticket number</span>
                  <strong>{result.ticket_code}</strong>
                </div>
                <div>
                  <span>Order number</span>
                  <strong>{result.order_number || '—'}</strong>
                </div>
              </div>
            )}

            {result.checked_in_at && (
              <small className="scan-result-time">
                Check-in time: {formatTime(result.checked_in_at)}
              </small>
            )}

            <button className="button" type="button" onClick={scanNext}>
              <TicketCheck size={17} /> Scan next ticket
            </button>
          </section>
        )}

        <section className="scanner-recent professional-recent-scans live-recent-scans">
          <div>
            <span className="eyebrow">Recent check-ins</span>
            <button
              className="scanner-refresh-button"
              type="button"
              onClick={() => void refreshSummary()}
            >
              <RefreshCw size={14} /> Refresh
            </button>
          </div>

          {summary?.recent.length ? (
            summary.recent.map((item) => (
              <p key={item.id}>
                <span className="scan-status" />
                <strong>{item.ticket_code}</strong>
                {' · '}{item.ticket_type_name}
                <small>
                  {item.holder_name ? `${item.holder_name} · ` : ''}
                  {formatTime(item.checked_in_at)}
                </small>
              </p>
            ))
          ) : (
            <div className="scanner-empty-recent">
              No guests have checked in yet.
            </div>
          )}

          {canViewAdminCheckins && (
            <Link className="scanner-admin-link" href="/admin/events/checkins">
              View check-in operations
            </Link>
          )}
        </section>
      </div>
    </main>
  )
}
