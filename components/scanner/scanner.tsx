'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, Camera, CheckCircle2, Clock3, Search, ShieldAlert, TicketCheck, XCircle } from 'lucide-react'
import { Brand } from '@/components/brand/brand'
import { Pill } from '@/components/public/public'

export function Scanner() {
  const [state, setState] = useState<'ready' | 'valid' | 'used' | 'invalid' | 'cancelled' | 'unpaid'>('ready')
  const [lookup, setLookup] = useState('')
  const labels = {
    valid: 'VALID TICKET',
    used: 'ALREADY USED',
    invalid: 'INVALID TICKET',
    cancelled: 'CANCELLED TICKET',
    unpaid: 'PAYMENT NOT CONFIRMED',
  }
  const icons = {
    valid: <CheckCircle2 size={30}/>,
    used: <Clock3 size={30}/>,
    invalid: <XCircle size={30}/>,
    cancelled: <ShieldAlert size={30}/>,
    unpaid: <AlertTriangle size={30}/>,
  }

  return (
    <main className="scanner professional-scanner">
      <header>
        <Link href="/"><Brand /></Link>
        <div className="scanner-header-status"><span className="live-indicator"/> Event check-in · Frontend preview</div>
      </header>
      <div className="scanner-body">
        <div className="scanner-heading">
          <Pill tone="gold">50MISA 2026 · Event Operations</Pill>
          <h1>Ticket check-in</h1>
          <p>Scan or search an individual ticket before admitting a guest.</p>
        </div>

        <section className="scanner-workspace">
          <div className="scan-frame professional-scan-frame">
            <i/><i/><i/><i/>
            <Camera size={36}/>
            <strong>Position QR code inside the frame</strong>
            <small>Camera integration will be connected later.</small>
          </div>

          <div className="scanner-divider"><span>or search manually</span></div>
          <div className="manual professional-manual">
            <div className="scanner-search-field"><Search size={17}/><input aria-label="Ticket lookup" value={lookup} onChange={e => setLookup(e.target.value)} placeholder="Ticket number, guest name or phone"/></div>
            <button className="button" onClick={() => setState(lookup ? 'valid' : 'ready')}>Search ticket</button>
          </div>
        </section>

        {state !== 'ready' && (
          <section className={`scan-result ${state}`}>
            <div className="result-icon">{icons[state]}</div>
            <Pill tone={state === 'valid' ? 'teal' : state === 'used' ? 'gold' : 'coral'}>{labels[state]}</Pill>
            <h2>{state === 'valid' ? 'Guest may enter' : state === 'used' ? 'Ticket already checked in' : 'Do not admit this ticket'}</h2>
            <div className="scan-detail-grid">
              <div><span>Guest</span><strong>Mariama Koroma</strong></div>
              <div><span>Ticket tier</span><strong>Degree</strong></div>
              <div><span>Ticket number</span><strong>TKT-26-X82F91</strong></div>
              <div><span>Order number</span><strong>ORD-26-00048</strong></div>
            </div>
            <button className="button" onClick={() => setState('ready')}>Scan next ticket</button>
          </section>
        )}

        <section className="scanner-recent professional-recent-scans">
          <div><span className="eyebrow">Recent activity</span><Link href="/admin/events/checkins">View check-ins</Link></div>
          <p><span className="scan-status"/><strong>TKT-26-X82F91</strong> · Degree <small>Checked in · 20:04</small></p>
          <p><span className="scan-status used"/><strong>TKT-26-P91J44</strong> · Diploma <small>Already used · 20:01</small></p>
        </section>

        <div className="demo-states"><span>Preview states:</span><button onClick={() => setState('valid')}>Valid</button><button onClick={() => setState('used')}>Used</button><button onClick={() => setState('invalid')}>Invalid</button><button onClick={() => setState('cancelled')}>Cancelled</button><button onClick={() => setState('unpaid')}>Unpaid</button></div>
      </div>
    </main>
  )
}
