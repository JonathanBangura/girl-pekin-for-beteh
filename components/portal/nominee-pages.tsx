'use client'

import Link from 'next/link'
import { Bell, Copy, Download, ExternalLink, FileText, QrCode, Share2, TrendingUp, UserRound } from 'lucide-react'
import { Pill } from '@/components/public/public'

export function NomineePage({ section = 'Dashboard' }: { section?: string }) {
  const isProfile = section === 'Profile'
  const isPerformance = section === 'Performance'
  const isCampaign = section === 'Campaign tools'
  const isAnnouncements = section === 'Announcements'
  const isDocuments = section === 'Documents'
  const isPass = section === 'Ceremony pass'

  return (
    <div className="portal-content v2-nominee-workspace">
      <div className="v2-admin-page-head">
        <div><span className="v2-admin-eyebrow">Nominee Portal · 50MISA26001</span><h1>{section}</h1><p>Manage your public profile, campaign resources and award information from one workspace.</p></div>
        {isProfile && <button className="button">Edit profile</button>}
      </div>

      {isProfile && (
        <div className="v2-nominee-profile-layout">
          <aside className="v2-nominee-summary-card"><div className="v2-account-avatar large">MK</div><h2>Mariama Koroma</h2><p>University of Sierra Leone</p><Pill tone="teal">Public profile · Demo</Pill><dl><div><dt>Nominee code</dt><dd>50MISA26001</dd></div><div><dt>Category</dt><dd>Community Champion · Demo</dd></div><div><dt>Status</dt><dd>Published · Demo</dd></div></dl><Link className="text-button" href="/nominees/50MISA26001">View public profile <ExternalLink size={14}/></Link></aside>
          <section className="panel v2-profile-form-preview"><div className="v2-card-head"><div><span className="v2-admin-eyebrow">Profile information</span><h2>Public details</h2></div><UserRound size={19}/></div><div className="v2-form-preview-grid"><label>Full name<input value="Mariama Koroma" readOnly/></label><label>Institution<input value="University of Sierra Leone" readOnly/></label><label>Nominee code<input value="50MISA26001" readOnly disabled/></label><label>Category<input value="Community Champion · Demo" readOnly disabled/></label><label className="full">Biography<textarea rows={6} value="Demo nominee biography content. Approved public information will replace this placeholder." readOnly/></label></div><p className="v2-form-note">Nominee code, category, votes and results are controlled by administrators.</p></section>
        </div>
      )}

      {isPerformance && (
        <>
          <div className="v2-kpi-grid nominee-kpis"><article><span>Total votes</span><strong>1,284</strong><small>Demo data</small></article><article><span>Current rank</span><strong>#04</strong><small>Demo ranking</small></article><article><span>Votes today</span><strong>86</strong><small>Demo data</small></article><article><span>Votes this week</span><strong>326</strong><small>Demo data</small></article></div>
          <div className="v2-dashboard-grid"><section className="panel v2-dashboard-card v2-chart-card"><div className="v2-card-head"><div><span className="v2-admin-eyebrow">Vote performance</span><h2>Campaign trend</h2></div><Pill>Demo analytics</Pill></div><div className="v2-bars">{[38,46,52,49,61,68,73,78,82,90,88,96].map((b,i)=><i key={i} style={{height:`${b}%`}} className={i===11?'current':''}/>)}</div><div className="v2-chart-footer"><span>Voting start</span><span>Current</span></div></section><aside className="panel v2-performance-breakdown"><span className="v2-admin-eyebrow">Campaign activity</span><h2>Engagement summary</h2><div><span>Public profile visits</span><strong>3,420</strong><small>Demo data</small></div><div><span>Voting page visits</span><strong>1,760</strong><small>Demo data</small></div><div><span>Completed vote checkouts</span><strong>214</strong><small>Demo data</small></div></aside></div>
        </>
      )}

      {isCampaign && (
        <div className="v2-campaign-tools-layout">
          <section className="v2-campaign-link-card"><span className="v2-admin-eyebrow light">Public voting link</span><h2>/vote/50MISA26001</h2><p>Use this link in approved campaign communication.</p><div><button className="button light"><Copy size={14}/> Copy Link</button><button className="v2-light-outline"><Share2 size={14}/> Share</button></div><dl><div><dt>Nominee code</dt><dd>50MISA26001</dd></div><div><dt>Edition</dt><dd>6th Edition · 2026</dd></div></dl></section>
          <section className="panel v2-campaign-assets"><div className="v2-card-head"><div><span className="v2-admin-eyebrow">Campaign assets</span><h2>Approved materials</h2></div><Pill>Demo placeholders</Pill></div><div className="v2-asset-grid"><button><QrCode size={20}/><span><b>QR Code</b><small>PNG placeholder</small></span><Download size={14}/></button><button><FileText size={20}/><span><b>Campaign Flyer</b><small>PDF placeholder</small></span><Download size={14}/></button><button><Share2 size={20}/><span><b>Square Post</b><small>1080 × 1080 placeholder</small></span><Download size={14}/></button><button><TrendingUp size={20}/><span><b>Story Asset</b><small>1080 × 1920 placeholder</small></span><Download size={14}/></button></div></section>
        </div>
      )}

      {isAnnouncements && (
        <section className="panel v2-announcements-panel"><div className="v2-card-head"><div><span className="v2-admin-eyebrow">Announcements</span><h2>Latest updates</h2></div><Pill>Demo content</Pill></div><div className="v2-announcement-list"><article><span className="v2-announcement-icon"><Bell size={16}/></span><div><small>Important · Demo</small><h3>Campaign guideline update</h3><p>Representative announcement content will appear here when the portal is connected to live data.</p></div><time>21 Aug</time></article><article><span className="v2-announcement-icon"><Bell size={16}/></span><div><small>Information · Demo</small><h3>Ceremony briefing</h3><p>Representative ceremony information will appear here when approved.</p></div><time>18 Aug</time></article></div></section>
      )}

      {isDocuments && (
        <section className="panel v2-documents-panel"><div className="v2-card-head"><div><span className="v2-admin-eyebrow">Documents</span><h2>Available resources</h2></div><Pill>Demo documents</Pill></div><div className="v2-document-table"><div className="head"><span>Document</span><span>Type</span><span>Status</span><span>Action</span></div>{['Nominee Letter','Campaign Guidelines','Ceremony Information'].map((name,i)=><div key={name}><span><FileText size={17}/><b>{name}</b></span><span>PDF placeholder</span><span><Pill tone="teal">Available</Pill></span><button className="text-button"><Download size={14}/> Download</button></div>)}</div></section>
      )}

      {isPass && (
        <div className="v2-pass-layout"><section className="v2-digital-pass"><div className="v2-pass-top"><span className="v2-admin-eyebrow light">Digital Ceremony Pass</span><span>6th Edition · 2026</span></div><h2>50 Most Influential Students&apos; Award – Sierra Leone</h2><p>21 November 2026 · 5:00 PM · Freetown City Hall</p><div className="v2-pass-identity"><div className="v2-account-avatar">MK</div><div><small>Nominee</small><strong>Mariama Koroma</strong><span>50MISA26001</span></div><div className="v2-pass-qr"><QrCode size={68}/><small>QR placeholder</small></div></div><div className="v2-pass-ticket"><span>Individual Ticket</span><strong>TKT-26-X82F91</strong></div></section><aside className="panel v2-pass-notes"><span className="v2-admin-eyebrow">Event information</span><h2>Keep this pass accessible.</h2><p>This frontend preview demonstrates how a nominee ceremony pass can be presented after ticket and QR integration.</p><ul><li>Present the individual QR ticket at check-in.</li><li>Ticket and order numbers remain separate.</li><li>Final event instructions will be supplied by administrators.</li></ul></aside></div>
      )}

      {!isProfile && !isPerformance && !isCampaign && !isAnnouncements && !isDocuments && !isPass && <section className="panel"><Pill>Frontend preview</Pill><h2>{section}</h2><p>This workspace is prepared for approved nominee content and future Supabase data integration.</p><Link className="text-button" href="/nominee">Return to dashboard</Link></section>}
    </div>
  )
}
