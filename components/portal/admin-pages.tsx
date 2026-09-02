'use client'

import Link from 'next/link'
import { Download, Filter, Plus, Search, SlidersHorizontal } from 'lucide-react'
import { Pill } from '@/components/public/public'

const configs: Record<string, {
  eyebrow: string
  description: string
  primary?: string
  stats: [string,string,string][]
  columns: string[]
  rows: string[][]
}> = {
  Programs: {
    eyebrow:'Content Operations', description:'Manage programme records, publication status and public visibility.', primary:'New Program',
    stats:[['Published','06','Demo data'],['Draft','02','Demo data'],['Featured','03','Demo data']],
    columns:['Program','Status','Start Date','Location','Featured','Action'],
    rows:[['Demo Programme One','Published','12 Sep 2026','Venue placeholder','Yes','Edit'],['Demo Programme Two','Draft','18 Oct 2026','Venue placeholder','No','Review'],['Demo Programme Three','Published','02 Nov 2026','Venue placeholder','Yes','Edit']],
  },
  Awards: {
    eyebrow:'Awards Management', description:'Monitor the active award edition and move quickly into nominees, voting and results.', primary:'New Edition',
    stats:[['Active edition','2026','6th Edition'],['Nominees','18','Demo data'],['Voting','Open','Frontend state']],
    columns:['Edition','Year','Status','Voting Window','Ceremony','Action'],
    rows:[["50 Most Influential Students' Award",'2026','Active','20 Jun – 20 Jul','21 Nov 2026','Manage']],
  },
  Editions: {
    eyebrow:'Awards / Editions', description:'Configure award editions, voting windows, ceremony references and publication status.', primary:'New Edition',
    stats:[['Current year','2026','Active edition'],['Total editions','06','Demo data'],['Archived','05','Demo data']],
    columns:['Award Edition','Year','Status','Voting Opens','Voting Closes','Ceremony','Action'],
    rows:[["50 Most Influential Students' Award – 6th Edition",'2026','Active','20 Jun 2026','20 Jul 2026','21 Nov 2026','Edit'],['Demo Previous Edition','2025','Archived','—','—','—','View']],
  },
  Categories: {
    eyebrow:'Awards / Categories', description:'Organize edition categories and monitor nominee distribution.', primary:'Add Category',
    stats:[['Categories','08','Demo data'],['Active','08','Demo data'],['Nominees','18','Demo data']],
    columns:['Category','Nominees','Status','Display Order','Action'],
    rows:[['Community Champion','5','Active','01','Edit'],['Future Maker','7','Active','02','Edit'],['Heart of Gold','6','Active','03','Edit']],
  },
  Applications: {
    eyebrow:'Awards / Applications', description:'Review submitted nominee applications and verification progress.',
    stats:[['Pending','12','Needs review'],['Under review','05','Demo data'],['Approved','18','Demo data']],
    columns:['Applicant','Institution','Category','Submitted','Verification','Status','Action'],
    rows:[['Demo Applicant 01','Institution placeholder','Community Champion','20 Aug 2026','Pending','Pending','Review'],['Demo Applicant 02','Institution placeholder','Future Maker','19 Aug 2026','Checked','Under Review','Open'],['Demo Applicant 03','Institution placeholder','Heart of Gold','18 Aug 2026','Checked','Approved','View']],
  },
  Nominees: {
    eyebrow:'Awards / Nominees', description:'Search, review and manage nominee records for the active edition.', primary:'Add Nominee',
    stats:[['Published','18','Demo data'],['Pending review','03','Demo data'],['Categories','08','Demo data']],
    columns:['Nominee','Code','Category','Institution','Votes','Status','Action'],
    rows:[['Mariama Koroma','50MISA26001','Community Champion','University of Sierra Leone','1,284','Published','View'],['Abdul Bangura','50MISA26002','Future Maker','Njala University','984','Published','View'],['Isatu Sesay','50MISA26003','Heart of Gold','Fourah Bay College','742','Published','View']],
  },
  Voting: {
    eyebrow:'Awards / Voting', description:'Monitor the configured voting window, public visibility settings and vote-order activity.',
    stats:[['Voting status','Open','Frontend state'],['Vote orders','1,284','Demo data'],['Leaderboard','Visible','Frontend state']],
    columns:['Order','Nominee','Code','Votes','Amount','Payment Status','Date'],
    rows:[['VOTE-260184','Mariama Koroma','50MISA26001','50','NLe 500','Successful','21 Aug 2026'],['VOTE-260183','Abdul Bangura','50MISA26002','25','NLe 250','Successful','21 Aug 2026'],['VOTE-260182','Isatu Sesay','50MISA26003','10','NLe 100','Pending','21 Aug 2026']],
  },
  Results: {
    eyebrow:'Awards / Results', description:'Review the result-certification workflow before publication.',
    stats:[['Reconciliation','Pending','Demo workflow'],['Adjustments','Reviewed','Demo workflow'],['Publication','Not published','Demo workflow']],
    columns:['Rank','Nominee','Code','Category','Certified Votes','Result Status'],
    rows:[['01','Mariama Koroma','50MISA26001','Community Champion','1,284','Under Review'],['02','Abdul Bangura','50MISA26002','Future Maker','984','Under Review'],['03','Isatu Sesay','50MISA26003','Heart of Gold','742','Under Review']],
  },
  Events: {
    eyebrow:'Event Operations', description:'Manage events, access modes, ticketing status and event-day readiness.', primary:'Create Event',
    stats:[['Upcoming','03','Demo data'],['Ticketed','01','Confirmed ceremony'],['Check-in ready','01','Frontend state']],
    columns:['Event','Date','Venue','Access Type','Ticketing','Status','Action'],
    rows:[["50 Most Influential Students' Award",'21 Nov 2026','Freetown City Hall','Paid Tickets','Enabled','Published','Manage'],['Demo Programme Forum','12 Oct 2026','Venue placeholder','Free Registration','Disabled','Draft','Edit']],
  },
  'Ticket Types': {
    eyebrow:'Events / Ticket Types', description:'Configure event-specific ticket tiers, pricing models and sales status.', primary:'Add Ticket Type',
    stats:[['Ticket tiers','04','2026 ceremony'],['Fixed price','03','Confirmed'],['Donation','01','Confirmed']],
    columns:['Ticket Tier','Pricing Type','Price','Capacity','Sold','Sales Status','Action'],
    rows:[['Diploma','Fixed','NLe 250','Demo','Demo','Available','Edit'],['Degree','Fixed','NLe 500','Demo','Demo','Available','Edit'],['Masters','Fixed','NLe 1,000','Demo','Demo','Available','Edit'],['PhD','Donation','By Donation','Demo','Demo','Available','Edit']],
  },
  Orders: {
    eyebrow:'Events / Orders', description:'Review ticket orders, customer details and payment state.',
    stats:[['Orders','48','Demo data'],['Paid','41','Demo data'],['Pending','07','Demo data']],
    columns:['Order #','Customer','Ticket Tier','Quantity','Total','Payment Status','Date'],
    rows:[['ORD-26-00048','Demo Customer','Degree','2','NLe 1,000','Successful','21 Aug 2026'],['ORD-26-00047','Demo Customer','Diploma','1','NLe 250','Successful','21 Aug 2026'],['ORD-26-00046','Demo Customer','PhD','1','NLe 750','Pending','21 Aug 2026']],
  },
  Tickets: {
    eyebrow:'Events / Individual Tickets', description:'Track issued individual tickets separately from their parent orders.',
    stats:[['Issued','72','Demo data'],['Active','68','Demo data'],['Checked in','14','Demo data']],
    columns:['Ticket #','Order #','Guest','Tier','Ticket Status','Check-In','Action'],
    rows:[['TKT-26-X82F91','ORD-26-00048','Demo Guest','Degree','Active','Checked In','View'],['TKT-26-X82F92','ORD-26-00048','Demo Guest','Degree','Active','Not Used','View'],['TKT-26-P91J44','ORD-26-00047','Demo Guest','Diploma','Active','Not Used','View']],
  },
  'Check-ins': {
    eyebrow:'Events / Check-ins', description:'Monitor event-day attendance and recent ticket scans.',
    stats:[['Tickets issued','72','Demo data'],['Checked in','14','Demo data'],['Remaining','58','Demo data']],
    columns:['Ticket','Guest','Tier','Check-In Time','Scanner','Status'],
    rows:[['TKT-26-X82F91','Demo Guest','Degree','20:04','Scanner 01','Checked In'],['TKT-26-A91D20','Demo Guest','Masters','20:02','Scanner 02','Checked In'],['TKT-26-P91J44','Demo Guest','Diploma','20:01','Scanner 01','Already Used']],
  },
  Finance: {
    eyebrow:'Finance Overview', description:'Review payment activity across voting, ticketing and donation transactions.',
    stats:[['Voting revenue','NLe 12,840','Demo data'],['Ticket revenue','NLe 18,500','Demo data'],['Pending payments','07','Demo data']],
    columns:['Reference','Type','Customer','Amount','Method','Status','Date'],
    rows:[['PAY-260184','Vote','Demo Voter','NLe 500','Placeholder','Successful','21 Aug 2026'],['PAY-260183','Ticket','Demo Customer','NLe 1,000','Placeholder','Successful','21 Aug 2026'],['PAY-260182','Donation','Demo Customer','NLe 750','Placeholder','Pending','21 Aug 2026']],
  },
  Payments: {
    eyebrow:'Finance / Payments', description:'Search and review vote, ticket and donation payments.',
    stats:[['Successful','126','Demo data'],['Pending','07','Demo data'],['Failed','03','Demo data']],
    columns:['Reference','Type','Customer','Amount','Method','Status','Date'],
    rows:[['PAY-260184','Vote','Demo Voter','NLe 500','Placeholder','Successful','21 Aug 2026'],['PAY-260183','Ticket','Demo Customer','NLe 1,000','Placeholder','Successful','21 Aug 2026'],['PAY-260182','Donation','Demo Customer','NLe 750','Placeholder','Pending','21 Aug 2026']],
  },
  Reconciliation: {
    eyebrow:'Finance / Reconciliation', description:'Compare provider totals with platform records and isolate mismatches.',
    stats:[['Provider total','NLe 31,340','Demo data'],['Platform total','NLe 31,340','Demo data'],['Difference','NLe 0','Demo data']],
    columns:['Reference','Provider Amount','Platform Amount','Difference','Reason','Action'],
    rows:[['PAY-260170','NLe 500','NLe 500','NLe 0','Matched','View'],['PAY-260169','NLe 250','NLe 200','NLe 50','Needs review','Review']],
  },
  Refunds: {
    eyebrow:'Finance / Refunds', description:'Review refund and reversal requests before action.',
    stats:[['Open requests','03','Demo data'],['Approved','01','Demo data'],['Completed','02','Demo data']],
    columns:['Reference','Customer','Type','Original Amount','Refund Amount','Reason','Status'],
    rows:[['RF-26003','Demo Customer','Ticket','NLe 500','NLe 500','Demo reason','Pending'],['RF-26002','Demo Voter','Vote','NLe 250','NLe 250','Demo reason','Approved']],
  },
  Reports: {
    eyebrow:'Finance / Reports', description:'Prepare voting, ticketing, payments and check-in reports for review or export.',
    stats:[['Report types','05','Frontend preview'],['Last generated','—','Not connected'],['Exports','Disabled','Backend pending']],
    columns:['Report','Scope','Format','Status','Action'],
    rows:[['Voting Report','2026 Edition','CSV / PDF','Ready for integration','Preview'],['Ticket Sales Report','50MISA 2026','CSV / PDF','Ready for integration','Preview'],['Payments Report','All payments','CSV / PDF','Ready for integration','Preview'],['Check-In Report','50MISA 2026','CSV / PDF','Ready for integration','Preview']],
  },
  Communication: {
    eyebrow:'Management / Communication', description:'Prepare announcements and notification templates for nominees and event audiences.', primary:'New Announcement',
    stats:[['Announcements','04','Demo data'],['Draft templates','03','Demo data'],['Audience groups','04','Frontend preview']],
    columns:['Title','Audience','Channel','Status','Updated','Action'],
    rows:[['Campaign guideline update','All Nominees','Portal / Email','Draft','21 Aug 2026','Edit'],['Ceremony briefing','Event Attendees','Email','Draft','20 Aug 2026','Edit']],
  },
  Content: {
    eyebrow:'Management / Content', description:'Manage public website sections and publication state from one CMS workspace.',
    stats:[['Published pages','09','Demo data'],['Drafts','03','Demo data'],['Media items','24','Demo data']],
    columns:['Section','Status','Last Updated','Owner','Action'],
    rows:[['Homepage','Published','21 Aug 2026','Content Team','Edit'],['About','Draft','20 Aug 2026','Content Team','Edit'],['News','Published','18 Aug 2026','Content Team','Manage'],['Partners & Sponsors','Draft','17 Aug 2026','Content Team','Edit']],
  },
  'Users & Roles': {
    eyebrow:'Management / Access', description:'Review administrative users, assigned roles and account status.', primary:'Add User',
    stats:[['Active users','09','Demo data'],['Roles','09','Configured model'],['Disabled','01','Demo data']],
    columns:['User','Email','Role','Status','Last Login','Action'],
    rows:[['Aminata Demo','admin@example.org','Super Admin','Active','Today','Manage'],['Finance Demo','finance@example.org','Finance Officer','Active','Yesterday','Manage'],['Scanner Demo','scanner@example.org','Check-In Officer','Active','21 Aug 2026','Manage']],
  },
  'Audit Logs': {
    eyebrow:'Management / Audit', description:'Read-only operational trail for sensitive administrative actions.',
    stats:[['Entries today','28','Demo data'],['Modules','06','Demo data'],['Read only','Yes','Frontend rule']],
    columns:['Date / Time','Actor','Action','Module','Target','Details'],
    rows:[['21 Aug · 20:04','Aminata Demo','Nominee Approved','Awards','50MISA26001','View'],['21 Aug · 19:42','Finance Demo','Payment Reviewed','Finance','PAY-260184','View'],['21 Aug · 18:20','Event Demo','Ticket Cancelled','Events','TKT-26-Z91D20','View']],
  },
  Settings: {
    eyebrow:'Management / Settings', description:'Central configuration workspace for organization, awards, voting, ticketing and notifications.',
    stats:[['Organization','Configured','Frontend preview'],['Voting','Configured','Frontend preview'],['Ticketing','Configured','Frontend preview']],
    columns:['Setting Area','Description','Status','Action'],
    rows:[['Organization','Profile and public defaults','Ready','Configure'],['Branding','Organization and award theme settings','Ready','Configure'],['Voting','Voting window and visibility defaults','Ready','Configure'],['Ticketing','Ticket defaults and sales behaviour','Ready','Configure'],['Notifications','Email and portal notifications','Ready','Configure']],
  },
}

export function AdminPage({ section = 'Dashboard' }: { section?: string }) {
  const c = configs[section] || configs.Content
  return (
    <div className="portal-content v2-admin-page">
      <div className="v2-admin-page-head">
        <div><span className="v2-admin-eyebrow">{c.eyebrow}</span><h1>{section}</h1><p>{c.description}</p></div>
        <div className="v2-admin-head-actions">{section === 'Reports' && <button className="button secondary"><Download size={14}/> Export</button>}{c.primary && <button className="button"><Plus size={14}/>{c.primary}</button>}</div>
      </div>

      <div className="v2-admin-stats">{c.stats.map(([label,value,note]) => <article key={label}><span>{label}</span><strong>{value}</strong><small>{note}</small></article>)}</div>

      <section className="panel v2-admin-table-panel">
        <div className="v2-admin-table-toolbar">
          <div><h2>{section} records</h2><Pill>Demo data</Pill></div>
          <div className="v2-admin-toolbar-actions"><label><Search size={14}/><input placeholder={`Search ${section.toLowerCase()}`} aria-label={`Search ${section}`}/></label><button className="button secondary compact"><Filter size={14}/> Filter</button><button className="v2-icon-button" aria-label="More filters"><SlidersHorizontal size={16}/></button></div>
        </div>
        <div className="responsive-table v2-responsive-table"><table><thead><tr>{c.columns.map(col => <th key={col}>{col}</th>)}</tr></thead><tbody>{c.rows.map((row, i) => <tr key={`${section}-${i}`}>{row.map((cell, j) => <td key={j}>{j === c.columns.length - 1 ? <button className="text-button">{cell}</button> : j > 0 && ['Status','Payment Status','Ticket Status','Check-In','Verification'].includes(c.columns[j]) ? <Pill tone={cell.includes('Pending') || cell.includes('Review') ? 'gold' : 'teal'}>{cell}</Pill> : <span>{cell}</span>}</td>)}</tr>)}</tbody></table></div>
        <div className="v2-table-footer"><span>Showing {c.rows.length} demo records</span><div><button disabled>Previous</button><b>1</b><button disabled>Next</button></div></div>
      </section>

      {section === 'Results' && <section className="panel v2-certification-flow"><span className="v2-admin-eyebrow">Result certification</span><div>{['Voting Closed','Payments Reconciled','Adjustments Reviewed','Results Reviewed','Results Approved','Results Published'].map((s,i)=><article key={s} className={i<2?'complete':''}><span>{String(i+1).padStart(2,'0')}</span><strong>{s}</strong><small>{i<2?'Complete':'Pending'}</small></article>)}</div></section>}
      {section === 'Check-ins' && <div className="v2-admin-secondary-action"><Link className="button" href="/scan">Open Event Scanner</Link></div>}
    </div>
  )
}
