'use client'

import { Pill, Button } from '@/components/public/public'

const rows = ['Record One', 'Record Two', 'Record Three', 'Record Four', 'Record Five']

export function AdminPage({ section = 'Dashboard' }: { section?: string }) {
  return (
    <div className="portal-content">
      <div className="portal-title professional-portal-title">
        <div>
          <Pill tone="teal">Administration · Frontend Preview</Pill>
          <h1>{section}</h1>
          <p>Manage and review {section.toLowerCase()} information from this workspace. Sample data is shown until Supabase integration begins.</p>
        </div>
        <Button>New {section === 'Dashboard' ? 'record' : section}</Button>
      </div>
      <div className="stat-row">
        <div className="stat-box"><span>Total records</span><b>48</b><small>Sample data</small></div>
        <div className="stat-box"><span>Requires review</span><b>12</b><small>Demo queue</small></div>
        <div className="stat-box"><span>Current status</span><b>Open</b><small>Frontend preview</small></div>
      </div>
      <section className="panel table-panel">
        <div className="table-head"><h2>{section} records</h2><Pill>Mock data</Pill></div>
        <div className="responsive-table">
          <table>
            <thead><tr><th>Reference</th><th>Description</th><th>Status</th><th>Updated</th><th>Action</th></tr></thead>
            <tbody>{rows.map((r, i) => <tr key={r}><td>DEMO-{String(i + 1).padStart(3, '0')}</td><td>{section} sample record {i + 1}</td><td><Pill tone={i % 2 ? 'gold' : 'teal'}>{i % 2 ? 'Review' : 'Active'}</Pill></td><td>21 Aug 2026</td><td><button className="text-button">View details</button></td></tr>)}</tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
