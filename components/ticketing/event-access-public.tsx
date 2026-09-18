import { notFound } from 'next/navigation'
import {
  CalendarDays,
  MapPin,
} from 'lucide-react'
import {
  PublicFooter,
  PublicHeader,
  Pill,
} from '@/components/public/public'
import {
  getFreeRegistrationOffer,
  getInvitationOffer,
} from '@/lib/ticketing/access-data'
import { FreeRegistrationForm } from './free-registration-form'
import { InvitationClaimForm } from './invitation-claim-form'

function dateTime(
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

export async function PublicFreeRegistrationPage({
  slug,
}: {
  slug: string
}) {
  const data =
    await getFreeRegistrationOffer(
      slug,
    )

  if (!data) {
    notFound()
  }

  return (
    <>
      <PublicHeader />
      <main className="section tickets-page professional-form-page mobile-transaction-page">
        <div className="transaction-header">
          <div>
            <Pill tone="gold">
              Free Registration
            </Pill>
            <h1>
              Register for{' '}
              {data.event.title}
            </h1>
            <p>
              No payment is required.
              A separate QR ticket is
              issued for each admission.
            </p>
          </div>

          <div className="transaction-meta">
            <span>
              <CalendarDays
                size={16}
              />
              {dateTime(
                data.event.starts_at,
              )}
            </span>
            <span>
              <MapPin size={16} />
              {data.event.venue ||
                'Venue to be confirmed'}
            </span>
          </div>
        </div>

        {data.ticketTypes.length ? (
          <FreeRegistrationForm
            eventSlug={
              data.event.slug
            }
            ticketTypes={
              data.ticketTypes
            }
          />
        ) : (
          <div className="live-public-empty">
            No free registration
            type is currently
            available.
          </div>
        )}
      </main>
      <PublicFooter />
    </>
  )
}

export async function PublicInvitationClaimPage({
  slug,
  token,
}: {
  slug: string
  token: string
}) {
  const invitation =
    await getInvitationOffer(
      token,
    )

  if (
    !invitation ||
    invitation.event_slug !==
      slug
  ) {
    notFound()
  }

  return (
    <>
      <PublicHeader />
      <main className="section tickets-page professional-form-page mobile-transaction-page">
        <div className="transaction-header">
          <div>
            <Pill tone="gold">
              Private Invitation
            </Pill>
            <h1>
              {
                invitation.event_title
              }
            </h1>
            <p>
              Invitation for{' '}
              {
                invitation.invitee_name
              }{' '}
              ·{' '}
              {
                invitation.ticket_type_name
              }{' '}
              ·{' '}
              {
                invitation.quantity
              }{' '}
              unit
              {invitation.quantity ===
              1
                ? ''
                : 's'}
            </p>
          </div>

          <div className="transaction-meta">
            <span>
              <CalendarDays
                size={16}
              />
              {dateTime(
                invitation.event_starts_at,
              )}
            </span>
            <span>
              <MapPin size={16} />
              {invitation.event_venue ||
                'Venue to be confirmed'}
            </span>
          </div>
        </div>

        <InvitationClaimForm
          token={token}
          inviteeName={
            invitation.invitee_name
          }
          status={
            invitation.invitation_status
          }
          claimedPublicToken={
            invitation.claimed_public_token
          }
        />
      </main>
      <PublicFooter />
    </>
  )
}
