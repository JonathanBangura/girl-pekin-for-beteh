'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Brand } from '@/components/brand/brand'
import { Pill } from '@/components/public/public'

export function Scanner() {
  const [state, setState] = useState<'ready' | 'valid' | 'used' | 'invalid' | 'cancelled' | 'unpaid'>('ready')
  const labels = { valid: 'VALID TICKET', used: 'ALREADY USED', invalid: 'INVALID TICKET', cancelled: 'CANCELLED TICKET', unpaid: 'PAYMENT NOT CONFIRMED' }
  return <main className="scanner"><header><Link href="/"><Brand /></Link><Pill tone="teal">Live event</Pill></header><div className="scanner-body"><Pill tone="gold">Awards check-in</Pill><h1>Scan a <em>ticket.</em></h1><p>Scan the individual ticket QR, not the order.</p><div className="scan-frame"><span>QR SCANNER</span></div>{state !== 'ready' && <section className={`scan-result ${state}`}><strong>{labels[state]}</strong><p>Order: ORD-26-00048</p><p>Ticket: TKT-26-X82F91</p></section>}<div className="scan-actions"><button className="button" onClick={() => setState('valid')}>Simulate valid</button><button className="button secondary" onClick={() => setState('used')}>Already used</button><button className="button secondary" onClick={() => setState('invalid')}>Invalid</button><button className="button secondary" onClick={() => setState('cancelled')}>Cancelled</button><button className="button secondary" onClick={() => setState('unpaid')}>Unpaid</button></div></div></main>
}
