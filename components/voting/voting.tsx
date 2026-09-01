'use client'

import Link from 'next/link'
import { useState } from 'react'
import { PublicFooter, PublicHeader, Pill } from '@/components/public/public'
import { nominees, mockVotePrice } from '@/lib/mock-data'

export function VoteScreen({ code }: { code?: string }) {
  const nominee = nominees.find((item) => item.code.toLowerCase() === code?.toLowerCase()) ?? nominees[0]
  const [quantity, setQuantity] = useState(1)
  const total = quantity * mockVotePrice
  return <><PublicHeader /><main className="section vote-page"><Pill tone="coral">People&apos;s choice · 2026</Pill><h1>Cast your vote for <em>{nominee.name}</em></h1><p>{nominee.category} · Nominee code {nominee.code}</p><article className="panel nominee-card"><div className={`mini-avatar ${nominee.color}`}>{nominee.initials}</div><h2>{nominee.name}</h2><p>{nominee.institution}</p><p>{nominee.story}</p></article><section className="panel order-summary"><h2>Your votes</h2><div className="quantity"><button aria-label="Decrease votes" onClick={() => setQuantity(Math.max(1, quantity - 1))}>−</button><b>{quantity}</b><button aria-label="Increase votes" onClick={() => setQuantity(quantity + 1)}>+</button></div><p>Price per vote · NLe {mockVotePrice}</p><strong>Total · NLe {total.toLocaleString()}</strong><Link className="button" href={`/vote/${nominee.code}/checkout?votes=${quantity}`}>Continue to Payment</Link></section></main><PublicFooter /></>
}

export function VoteCheckout({ code, votes }: { code: string; votes: number }) {
  const nominee = nominees.find((item) => item.code.toLowerCase() === code.toLowerCase()) ?? nominees[0]
  const total = votes * mockVotePrice
  return <><PublicHeader /><main className="section checkout-page"><Pill tone="coral">Frontend demo checkout</Pill><h1>Complete your <em>vote.</em></h1><section className="panel order-summary"><h2>{nominee.name}</h2><p>Nominee Code · {nominee.code}</p><p>Votes · {votes}</p><p>Price per Vote · NLe {mockVotePrice}</p><strong>Total · NLe {total.toLocaleString()}</strong><label>Email<input type="email" placeholder="you@example.com" /></label><label>Phone<input type="tel" placeholder="+232 ..." /></label><p>Payment Method · Placeholder for future wiring</p><button className="button" type="button">Submit demo vote</button></section></main><PublicFooter /></>
}
