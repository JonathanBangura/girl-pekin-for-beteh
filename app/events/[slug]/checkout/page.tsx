import { PublicHeader, PublicFooter, Pill } from '@/components/public/public'
import { eventDetails, ticketTiers } from '@/lib/mock-data'

export default async function EventCheckout({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ tier?: string; quantity?: string; donation?: string }> }) {
  await params
  const query = await searchParams
  const selected = ticketTiers.find(t => t.name.toLowerCase() === (query.tier ?? '').toLowerCase()) ?? ticketTiers[0]
  const quantity = Math.max(1, Number(query.quantity ?? 1) || 1)
  const donation = Math.max(0, Number(query.donation ?? 0) || 0)
  const unitPrice = selected.price || donation
  const total = unitPrice * quantity

  return (
    <>
      <PublicHeader/>
      <main className="section checkout-page professional-form-page">
        <div className="transaction-header"><div><Pill tone="gold">Event Checkout · Frontend Preview</Pill><h1>Review your ticket order.</h1><p>{eventDetails.title}</p></div><div className="transaction-meta"><span>{eventDetails.date} · {eventDetails.time}</span><span>{eventDetails.location}</span></div></div>
        <div className="transaction-layout checkout-layout">
          <section className="panel checkout-form-card">
            <h2>Guest information</h2>
            <p>Enter the primary customer details for this order.</p>
            <div className="form-grid"><label>Full name<input placeholder="Enter full name"/></label><label>Email address<input type="email" placeholder="name@example.com"/></label><label>Phone number<input type="tel" placeholder="+232 ..."/></label></div>
            <div className="payment-placeholder"><span>Payment method</span><strong>Payment options will be connected during backend integration.</strong></div>
          </section>
          <aside className="panel order-summary professional-order-summary">
            <Pill tone="teal">Order summary</Pill>
            <div className="summary-line"><span>Ticket tier</span><strong>{selected.name}</strong></div>
            <div className="summary-line"><span>{selected.price ? 'Unit price' : 'Donation per ticket'}</span><strong>NLe {unitPrice.toLocaleString()}</strong></div>
            <div className="summary-line"><span>Quantity</span><strong>{quantity}</strong></div>
            <div className="summary-total"><span>Total</span><strong>NLe {total.toLocaleString()}</strong><small>NLe {unitPrice.toLocaleString()} × {quantity}</small></div>
            <button className="button checkout-button" type="button">Continue to payment</button>
            <p className="secure-note">Frontend preview only. No payment will be processed.</p>
          </aside>
        </div>
      </main>
      <PublicFooter/>
    </>
  )
}
