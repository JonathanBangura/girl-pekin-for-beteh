'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Minus, Plus, ShieldCheck } from 'lucide-react'
import { PublicFooter, PublicHeader, Pill } from '@/components/public/public'
import { nominees, mockVotePrice } from '@/lib/mock-data'

export function VoteScreen({ code }: { code?: string }) {
  const nominee = nominees.find((item) => item.code.toLowerCase() === code?.toLowerCase()) ?? nominees[0]
  const [quantity, setQuantity] = useState(10)
  const total = quantity * mockVotePrice
  const quickOptions = [10, 25, 50, 100]

  return (
    <>
      <PublicHeader />
      <main className="section vote-page professional-form-page">
        <div className="transaction-header">
          <div><Pill tone="teal">Public Voting · 2026</Pill><h1>Vote for {nominee.name}.</h1><p>Nominee code {nominee.code} · {nominee.institution}</p></div>
          <span className="transaction-security"><ShieldCheck size={17}/> Secure vote checkout preview</span>
        </div>

        <div className="transaction-layout vote-layout">
          <article className="panel nominee-vote-profile">
            <div className="nominee-card-top"><div className={`mini-avatar ${nominee.color}`}>{nominee.initials}</div><span className="nominee-code">{nominee.code}</span></div>
            <Pill tone="teal">{nominee.category.replace('Mock category: ', '')}</Pill>
            <h2>{nominee.name}</h2>
            <p className="nominee-institution">{nominee.institution}</p>
            <p>{nominee.story}</p>
          </article>

          <section className="panel order-summary professional-order-summary">
            <Pill tone="gold">Vote selection</Pill>
            <h2>Choose number of votes</h2>
            <div className="vote-quick-grid">
              {quickOptions.map(option => <button key={option} className={quantity === option ? 'active' : ''} onClick={() => setQuantity(option)}>{option}</button>)}
            </div>
            <div className="form-field">Custom quantity
              <div className="quantity professional-quantity"><button aria-label="Decrease votes" onClick={() => setQuantity(Math.max(1, quantity - 1))}><Minus size={15}/></button><b>{quantity}</b><button aria-label="Increase votes" onClick={() => setQuantity(quantity + 1)}><Plus size={15}/></button></div>
            </div>
            <div className="summary-line"><span>Price per vote</span><strong>NLe {mockVotePrice}</strong></div>
            <div className="summary-total"><span>Total</span><strong>NLe {total.toLocaleString()}</strong><small>{quantity} vote{quantity > 1 ? 's' : ''}</small></div>
            <Link className="button checkout-button" href={`/vote/${nominee.code}/checkout?votes=${quantity}`}>Continue to checkout</Link>
            <p className="secure-note">Price shown is demo/configurable frontend data.</p>
          </section>
        </div>
      </main>
      <PublicFooter />
    </>
  )
}

export function VoteCheckout({ code, votes }: { code: string; votes: number }) {
  const nominee = nominees.find((item) => item.code.toLowerCase() === code.toLowerCase()) ?? nominees[0]
  const total = votes * mockVotePrice
  return (
    <>
      <PublicHeader />
      <main className="section checkout-page professional-form-page">
        <div className="transaction-header"><div><Pill tone="teal">Vote Checkout · Frontend Preview</Pill><h1>Review your vote order.</h1><p>{nominee.name} · {nominee.code}</p></div><span className="transaction-security"><ShieldCheck size={17}/> Payment connection pending</span></div>
        <div className="transaction-layout checkout-layout">
          <section className="panel checkout-form-card">
            <h2>Contact information</h2>
            <p>Used for order confirmation when payment integration is connected.</p>
            <div className="form-grid"><label>Email address<input type="email" placeholder="name@example.com" /></label><label>Phone number<input type="tel" placeholder="+232 ..." /></label></div>
            <div className="payment-placeholder"><span>Payment method</span><strong>Payment options will be connected in the backend phase.</strong></div>
          </section>
          <aside className="panel order-summary professional-order-summary">
            <Pill tone="gold">Order summary</Pill>
            <div className="summary-line"><span>Nominee</span><strong>{nominee.name}</strong></div>
            <div className="summary-line"><span>Nominee code</span><strong>{nominee.code}</strong></div>
            <div className="summary-line"><span>Votes</span><strong>{votes}</strong></div>
            <div className="summary-line"><span>Price per vote</span><strong>NLe {mockVotePrice}</strong></div>
            <div className="summary-total"><span>Total</span><strong>NLe {total.toLocaleString()}</strong></div>
            <button className="button checkout-button" type="button">Continue to payment</button>
            <p className="secure-note">Frontend preview only. No payment will be processed.</p>
          </aside>
        </div>
      </main>
      <PublicFooter />
    </>
  )
}
