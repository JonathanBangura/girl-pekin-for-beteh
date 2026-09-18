# Phase 15 Manual Existing-File Patches

Only use this if you do not run `APPLY_PHASE15_PATCHES.py`.

## `components/portal/portal.tsx`

Under EVENTS add:

```ts
['Access & Guests', '/admin/events/access', UserRound],
```

between Events and Ticket Types.

Add route label:

```ts
'/admin/events/access': 'Events / Access & Guests',
```

## `components/portal/event-management-live.tsx`

Add this page-header button:

```tsx
<Link
  className="button secondary"
  href="/admin/events/access"
>
  Access & Guests
</Link>
```

## `components/ticketing/live-ticketing.tsx`

Keep the existing paid-ticket CTA. Add a **Register free** link to
`/events/${data.event.slug}/register` when the event is published,
`access_type === 'free_registration'`, and an active free ticket type exists.

For invitation-only events show **Private invitation required** rather than a
public purchase/registration action.

Also add the same free-registration CTA in the lower access preview and explain
that invitation-only access is issued through the private claim link created by
the event team.
