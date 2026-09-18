from pathlib import Path

ROOT = Path.cwd()

def replace_once(path_str, old, new):
    path = ROOT / path_str
    if not path.exists():
        raise SystemExit(f"Missing expected file: {path_str}")

    source = path.read_text(encoding="utf-8")

    if new in source:
        print(f"Already patched: {path_str}")
        return

    count = source.count(old)
    if count != 1:
        raise SystemExit(
            f"Expected exactly one source fragment in {path_str}; found {count}."
        )

    path.write_text(
        source.replace(old, new, 1),
        encoding="utf-8",
    )
    print(f"Patched: {path_str}")

replace_once(
    "components/portal/portal.tsx",
    """      ['Events', '/admin/events', CalendarDays],
      ['Ticket Types', '/admin/events/ticket-types', Ticket],
      ['Orders', '/admin/events/orders', Receipt],""",
    """      ['Events', '/admin/events', CalendarDays],
      ['Access & Guests', '/admin/events/access', UserRound],
      ['Ticket Types', '/admin/events/ticket-types', Ticket],
      ['Orders', '/admin/events/orders', Receipt],""",
)

replace_once(
    "components/portal/portal.tsx",
    """    '/admin/events': 'Events',
    '/admin/events/ticket-types': 'Events / Ticket Types',""",
    """    '/admin/events': 'Events',
    '/admin/events/access': 'Events / Access & Guests',
    '/admin/events/ticket-types': 'Events / Ticket Types',""",
)

replace_once(
    "components/portal/event-management-live.tsx",
    """          <Link
            className="button secondary"
            href="/admin/events/ticket-types"
          >
            Ticket Types
          </Link>
          <Link
            className="button secondary"
            href="/admin/events/checkins"
          >""",
    """          <Link
            className="button secondary"
            href="/admin/events/access"
          >
            Access & Guests
          </Link>
          <Link
            className="button secondary"
            href="/admin/events/ticket-types"
          >
            Ticket Types
          </Link>
          <Link
            className="button secondary"
            href="/admin/events/checkins"
          >""",
)

replace_once(
    "components/ticketing/live-ticketing.tsx",
    """              {data.event.status === 'published' &&
                data.event.access_type === 'paid' &&
                data.ticketTypes.length > 0 && (
                  <Link
                    className="button light"
                    href={`/events/${data.event.slug}/tickets`}
                  >
                    <Ticket size={15} /> Choose tickets
                  </Link>
                )}""",
    """              {data.event.status === 'published' &&
                data.event.access_type === 'paid' &&
                data.ticketTypes.length > 0 && (
                  <Link
                    className="button light"
                    href={`/events/${data.event.slug}/tickets`}
                  >
                    <Ticket size={15} /> Choose tickets
                  </Link>
                )}

              {data.event.status === 'published' &&
                data.event.access_type === 'free_registration' &&
                data.ticketTypes.some((type) => type.pricing_type === 'free') && (
                  <Link
                    className="button light"
                    href={`/events/${data.event.slug}/register`}
                  >
                    <Ticket size={15} /> Register free
                  </Link>
                )}

              {data.event.status === 'published' &&
                data.event.access_type === 'invitation_only' && (
                  <Pill tone="gold">Private invitation required</Pill>
                )}""",
)

replace_once(
    "components/ticketing/live-ticketing.tsx",
    """            {data.event.status === 'published' &&
              data.event.access_type === 'paid' &&
              data.ticketTypes.length > 0 && (
                <Link
                  className="button"
                  href={`/events/${data.event.slug}/tickets`}
                >
                  Select tickets
                </Link>
              )}""",
    """            {data.event.status === 'published' &&
              data.event.access_type === 'paid' &&
              data.ticketTypes.length > 0 && (
                <Link
                  className="button"
                  href={`/events/${data.event.slug}/tickets`}
                >
                  Select tickets
                </Link>
              )}

            {data.event.status === 'published' &&
              data.event.access_type === 'free_registration' &&
              data.ticketTypes.some((type) => type.pricing_type === 'free') && (
                <Link
                  className="button"
                  href={`/events/${data.event.slug}/register`}
                >
                  Register free
                </Link>
              )}

            {data.event.access_type === 'invitation_only' && (
              <p className="live-empty-copy">
                Access is issued through a private invitation link created by the event team.
              </p>
            )}""",
)

print("Phase 15 existing-file patches complete.")
