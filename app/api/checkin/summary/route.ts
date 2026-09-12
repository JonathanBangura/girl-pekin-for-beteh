import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCheckinSummary } from '@/lib/checkin/data'

export async function GET(request: NextRequest) {
  const eventId =
    request.nextUrl.searchParams.get('event_id')?.trim() ?? ''

  if (!eventId) {
    return NextResponse.json(
      { error: 'Event is required.' },
      { status: 400 },
    )
  }

  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()

  if (!claimsData?.claims?.sub) {
    return NextResponse.json(
      { error: 'Authentication required.' },
      { status: 401 },
    )
  }

  const [
    { data: canCheckIn },
    { data: canManageEvent },
  ] = await Promise.all([
    supabase.rpc('has_permission', {
      requested_permission_code: 'checkin.use',
      requested_scope_type: 'event',
      requested_scope_id: eventId,
    }),
    supabase.rpc('has_permission', {
      requested_permission_code: 'events.manage',
      requested_scope_type: 'event',
      requested_scope_id: eventId,
    }),
  ])

  if (canCheckIn !== true && canManageEvent !== true) {
    return NextResponse.json(
      { error: 'Not authorized for this event.' },
      { status: 403 },
    )
  }

  return NextResponse.json(await getCheckinSummary(eventId))
}
