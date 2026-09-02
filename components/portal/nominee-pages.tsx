'use client'

import Link from 'next/link'
import { Copy, Download, FileText, QrCode, Share2 } from 'lucide-react'
import { Pill, Button } from '@/components/public/public'

export function NomineePage({ section = 'Dashboard' }: { section?: string }) {
  const isProfile = section === 'Profile'
  const isPerformance = section === 'Performance'
  const isCampaign = section === 'Campaign tools'
  const isAnnouncements = section === 'Announcements'
  const isDocuments = section === 'Documents'
  const isPass = section === 'Ceremony pass'

  return (
    <div className="portal-content">
      <div className="portal-title professional-portal-title">
        <div>
          <Pill tone="teal">Nominee Portal · 50MISA26001</Pill>
          <h1>{section}</h1>
          <p>Manage your nominee profile, campaign resources and award information from one secure workspace.</p>
        </div>
        {isProfile && <Button>Edit profile</Button>}
      </div>

      {isPerformance && <div className="stat-row"><div className="stat-box"><span>Total votes</span><b>1,284</b><small>Sample data</small></div><div className="stat-box"><span>Current rank</span><b>#04</b><small>Demo ranking</small></div><div className="stat-box"><span>Votes this week</span><b>326</b><small>Sample data</small></div></div>}

      {isProfile && <section className="panel nominee-detail-panel"><div className="profile-avatar">MK</div><div><Pill>Public profile · Demo</Pill><h2>Mariama Koroma</h2><p>University of Sierra Leone</p><p>Nominee Code: <strong>50MISA26001</strong></p><p>Biography and approved public profile information will be managed here.</p></div></section>}

      {isCampaign && <section className="panel nominee-tools-panel"><div><Pill tone="teal">Campaign tools</Pill><h2>Your public voting link</h2><p>/vote/50MISA26001</p></div><div className="tool-grid"><button><Copy size={17}/><span>Copy link</span></button><button><Share2 size={17}/><span>Share campaign</span></button><button><QrCode size={17}/><span>Download QR</span></button><button><Download size={17}/><span>Campaign flyer</span></button></div></section>}

      {isAnnouncements && <section className="panel"><div className="table-head"><h2>Announcements</h2><Pill>Demo content</Pill></div><div className="notice-list"><article><span className="eyebrow">Important · Demo</span><h3>Campaign guideline update</h3><p>Representative announcement content will appear here.</p></article><article><span className="eyebrow">Information · Demo</span><h3>Ceremony briefing</h3><p>Representative ceremony information will appear here.</p></article></div></section>}

      {isDocuments && <section className="panel table-panel"><div className="table-head"><h2>Documents</h2><Pill>Demo documents</Pill></div><div className="document-list">{['Nominee Letter','Campaign Guidelines','Ceremony Information'].map(name => <div key={name}><FileText size={18}/><span><strong>{name}</strong><small>Frontend placeholder</small></span><button className="button secondary compact">Download</button></div>)}</div></section>}

      {isPass && <section className="panel digital-pass"><div><Pill tone="gold">Digital Ceremony Pass</Pill><h2>50 Most Influential Students&apos; Award – Sierra Leone</h2><p>21 November 2026 · 5:00 PM · Freetown City Hall</p><div className="pass-meta"><span>Nominee<strong>Mariama Koroma</strong></span><span>Ticket<strong>TKT-26-X82F91</strong></span></div></div><div className="pass-qr"><QrCode size={62}/><small>QR placeholder</small></div></section>}

      {!isProfile && !isPerformance && !isCampaign && !isAnnouncements && !isDocuments && !isPass && <section className="panel"><Pill>Frontend preview</Pill><h2>{section}</h2><p>This workspace is prepared for approved nominee content and future Supabase data integration.</p><Link className="text-button" href="/nominee">Return to dashboard</Link></section>}
    </div>
  )
}
