import { randomBytes, randomUUID } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { hashTicketToken, makeTicketToken } from './ticket-security'

function shortYear(value?: string | null) {
  const date = value ? new Date(value) : new Date()
  return String(date.getUTCFullYear()).slice(-2)
}

function makeTicketCode(year: string) {
  return `TKT-${year}-${randomBytes(6).toString('hex').toUpperCase()}`
}

export async function issueTicketsForPaidOrder(ticketOrderId: string) {
  const admin = createAdminClient()

  const { data: order, error: orderError } = await admin
    .from('ticket_orders')
    .select('id,order_number,event_id,purchaser_name,purchaser_email,purchaser_phone,status,public_token')
    .eq('id', ticketOrderId)
    .maybeSingle()

  if (orderError || !order) throw new Error('Ticket order not found.')
  if (order.status !== 'paid') {
    throw new Error('Tickets can only be issued for a paid order.')
  }

  const [{ data: payment }, { data: event }, { data: items }] = await Promise.all([
    admin.from('payments')
      .select('id,status')
      .eq('ticket_order_id', order.id)
      .eq('provider', 'vult')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin.from('events')
      .select('id,title,slug,venue,starts_at')
      .eq('id', order.event_id)
      .maybeSingle(),
    admin.from('ticket_order_items')
      .select('id,ticket_type_id,ticket_type_name,quantity,admissions_per_unit')
      .eq('ticket_order_id', order.id)
      .order('created_at', { ascending: true }),
  ])

  if (!payment || payment.status !== 'succeeded') {
    throw new Error('Tickets cannot be issued before payment succeeds.')
  }
  if (!event) throw new Error('Event not found for ticket order.')

  const { data: currentTickets } = await admin
    .from('tickets')
    .select('id,ticket_order_item_id,ticket_type_id,ticket_code,status,holder_name,admission_sequence,issued_at')
    .eq('ticket_order_id', order.id)

  const existing = new Set(
    (currentTickets ?? []).map((ticket) =>
      `${ticket.ticket_order_item_id}:${ticket.admission_sequence}`,
    ),
  )

  const year = shortYear(event.starts_at)

  for (const item of items ?? []) {
    const admissions = item.quantity * item.admissions_per_unit

    for (let sequence = 1; sequence <= admissions; sequence += 1) {
      const key = `${item.id}:${sequence}`
      if (existing.has(key)) continue

      const ticketId = randomUUID()
      const rawToken = makeTicketToken(ticketId)

      const { error } = await admin.from('tickets').insert({
        id: ticketId,
        ticket_order_id: order.id,
        ticket_order_item_id: item.id,
        event_id: order.event_id,
        ticket_type_id: item.ticket_type_id,
        ticket_code: makeTicketCode(year),
        qr_token_hash: hashTicketToken(rawToken),
        status: 'active',
        holder_name: order.purchaser_name,
        admission_sequence: sequence,
      })

      if (error && error.code !== '23505') {
        throw new Error(`Unable to issue ticket admission ${sequence}.`)
      }
    }
  }

  const { data: issued, error: issuedError } = await admin
    .from('tickets')
    .select('id,ticket_order_item_id,ticket_type_id,ticket_code,status,holder_name,admission_sequence,issued_at')
    .eq('ticket_order_id', order.id)
    .order('issued_at', { ascending: true })

  if (issuedError) throw new Error('Unable to load issued tickets.')

  const itemNames = new Map(
    (items ?? []).map((item) => [item.id, item.ticket_type_name]),
  )

  return {
    order,
    event,
    tickets: (issued ?? []).map((ticket) => ({
      ...ticket,
      ticket_type_name: itemNames.get(ticket.ticket_order_item_id) ?? 'Event Ticket',
      raw_token: makeTicketToken(ticket.id),
    })),
  }
}
