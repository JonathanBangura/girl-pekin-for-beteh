import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import QRCode from 'qrcode'
import {
  CalendarDays,
  MapPin,
  Ticket,
} from 'lucide-react'
import { getTicketWalletData } from '@/lib/ticketing/ticket-wallet'
import { makeTicketQrPayload } from '@/lib/ticketing/ticket-security'
import { ResendTicketEmailButton } from './resend-ticket-email-button'

function formatDate(
  value?: string | null,
) {
  if (!value) {
    return 'To be confirmed'
  }

  return new Intl.DateTimeFormat(
    'en-SL',
    {
      dateStyle: 'full',
      timeStyle: 'short',
      timeZone: 'Africa/Freetown',
    },
  ).format(new Date(value))
}

function confirmedCopy(
  sourceType?: string | null,
) {
  switch (sourceType) {
    case 'free_registration':
      return 'Registration confirmed'
    case 'invitation':
      return 'Invitation confirmed'
    case 'complimentary':
      return 'Complimentary admission'
    default:
      return 'Payment confirmed'
  }
}

export async function TicketWallet({
  token,
}: {
  token: string
}) {
  const data =
    await getTicketWalletData(
      token,
    )

  if (!data) {
    notFound()
  }

  const tickets =
    await Promise.all(
      data.tickets.map(
        async (ticket) => ({
          ...ticket,
          qr: await QRCode.toDataURL(
            makeTicketQrPayload(
              ticket.raw_token,
            ),
            {
              errorCorrectionLevel:
                'M',
              margin: 1,
              width: 340,
            },
          ),
        }),
      ),
    )

  const admissionConfirmed =
    ['paid', 'confirmed'].includes(
      data.order.status,
    )

  return (
    <main className="ticket-wallet-page">
      <section className="ticket-wallet-shell">
        <header className="ticket-wallet-header">
          <Image
            src="/icon.svg"
            alt="Girl Pikin For Betteh Foundation"
            width={54}
            height={54}
          />

          <div>
            <span>
              Official Event Tickets
            </span>
            <h1>
              {data.event.title}
            </h1>
            <p>
              Order{' '}
              {
                data.order
                  .order_number
              }
            </p>
          </div>
        </header>

        <div className="ticket-wallet-event-meta">
          <span>
            <CalendarDays
              size={17}
            />
            {formatDate(
              data.event.starts_at,
            )}
          </span>
          <span>
            <MapPin size={17} />
            {data.event.venue ||
              'Venue to be confirmed'}
          </span>
        </div>

        {!admissionConfirmed ? (
          <div className="ticket-wallet-pending">
            <strong>
              Admission is still being
              confirmed.
            </strong>
            <p>
              Your QR tickets will
              appear here once the
              order is confirmed.
            </p>
          </div>
        ) : tickets.length ? (
          <>
            <div className="ticket-wallet-intro">
              <Ticket size={18} />
              <p>
                {confirmedCopy(
                  data.order
                    .source_type,
                )}
                . Each admission below
                is a separate ticket.
                Present one QR code per
                person at check-in.
              </p>
            </div>

            <div className="ticket-wallet-grid">
              {tickets.map(
                (ticket) => (
                  <article
                    className="ticket-wallet-card"
                    key={ticket.id}
                  >
                    <div className="ticket-wallet-card-head">
                      <span>
                        {
                          ticket.ticket_type_name
                        }
                      </span>
                      <strong>
                        Admission{' '}
                        {
                          ticket.admission_sequence
                        }
                      </strong>
                    </div>

                    <div className="ticket-wallet-qr">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={ticket.qr}
                        alt={`QR ticket ${ticket.ticket_code}`}
                        width={340}
                        height={340}
                      />
                    </div>

                    <div className="ticket-wallet-code">
                      <span>
                        Ticket Code
                      </span>
                      <strong>
                        {
                          ticket.ticket_code
                        }
                      </strong>
                    </div>

                    <p>
                      Status:{' '}
                      <b>
                        {
                          ticket.status
                        }
                      </b>
                    </p>
                  </article>
                ),
              )}
            </div>

            {data.canResendEmail ? (
              <ResendTicketEmailButton
                token={token}
              />
            ) : null}
          </>
        ) : (
          <div className="ticket-wallet-pending">
            <strong>
              Admission is confirmed.
            </strong>
            <p>
              Ticket issuance is being
              finalized. Refresh this
              page shortly.
            </p>
          </div>
        )}

        <div className="ticket-wallet-footer-actions">
          <Link
            className="button secondary"
            href={`/events/${data.event.slug}`}
          >
            Back to Event
          </Link>
        </div>
      </section>
    </main>
  )
}
