'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  ArrowUpRight,
  Award,
  BadgeCheck,
  Bell,
  CalendarDays,
  ClipboardList,
  ExternalLink,
  FileBarChart,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Menu,
  Megaphone,
  PanelsTopLeft,
  Receipt,
  RefreshCw,
  ScanLine,
  ScrollText,
  Settings,
  Share2,
  ShieldCheck,
  Ticket,
  TrendingUp,
  Trophy,
  Undo2,
  UserRound,
  Users,
  Vote,
  WalletCards,
  X,
} from 'lucide-react'
import { Brand } from '@/components/brand/brand'
import { stats, bars } from '@/lib/mock-data'

export function StatusBadge({ children, tone = '' }: { children: React.ReactNode; tone?: string }) {
  return <span className={`pill ${tone}`}>{children}</span>
}

type NavItem = readonly [string, string, React.ComponentType<{ size?: number }>]
type NavGroup = readonly [string, readonly NavItem[]]

const adminGroups: readonly NavGroup[] = [
  ['MAIN', [
    ['Dashboard', '/admin', LayoutDashboard],
    ['Programs', '/admin/programs', GraduationCap],
  ]],
  ['AWARDS', [
    ['Overview', '/admin/awards', Award],
    ['Editions', '/admin/awards/editions', PanelsTopLeft],
    ['Categories', '/admin/awards/categories', ClipboardList],
    ['Applications', '/admin/awards/applications', FileText],
    ['Nominees', '/admin/awards/nominees', Users],
    ['Voting', '/admin/awards/voting', Vote],
    ['Results', '/admin/awards/results', Trophy],
  ]],
  ['EVENTS', [
    ['Events', '/admin/events', CalendarDays],
    ['Ticket Types', '/admin/events/ticket-types', Ticket],
    ['Orders', '/admin/events/orders', Receipt],
    ['Tickets', '/admin/events/tickets', BadgeCheck],
    ['Check-ins', '/admin/events/checkins', ScanLine],
  ]],
  ['FINANCE', [
    ['Overview', '/admin/finance', WalletCards],
    ['Payments', '/admin/finance/payments', Receipt],
    ['Reconciliation', '/admin/finance/reconciliation', RefreshCw],
    ['Refunds', '/admin/finance/refunds', Undo2],
    ['Reports', '/admin/finance/reports', FileBarChart],
  ]],
  ['MANAGEMENT', [
    ['Communication', '/admin/communication', Megaphone],
    ['Content', '/admin/content', PanelsTopLeft],
    ['Users & Roles', '/admin/users', ShieldCheck],
    ['Audit Logs', '/admin/audit', ScrollText],
    ['Settings', '/admin/settings', Settings],
  ]],
]

const nomineeLinks: readonly NavItem[] = [
  ['Dashboard', '/nominee', LayoutDashboard],
  ['My Profile', '/nominee/profile', UserRound],
  ['Vote Performance', '/nominee/performance', TrendingUp],
  ['Campaign Tools', '/nominee/campaign', Share2],
  ['Announcements', '/nominee/announcements', Bell],
  ['Documents', '/nominee/documents', FileText],
  ['Ceremony Pass', '/nominee/pass', BadgeCheck],
]

function active(path: string, href: string) {
  if (href === '/admin' || href === '/nominee') return path === href
  return path === href || path.startsWith(`${href}/`)
}

function routeLabel(path: string, admin: boolean) {
  const labels: Record<string, string> = {
    '/admin':'Dashboard', '/admin/programs':'Programs', '/admin/awards':'Awards', '/admin/awards/editions':'Awards / Editions', '/admin/awards/categories':'Awards / Categories', '/admin/awards/applications':'Awards / Applications', '/admin/awards/nominees':'Awards / Nominees', '/admin/awards/voting':'Awards / Voting', '/admin/awards/results':'Awards / Results', '/admin/events':'Events', '/admin/events/ticket-types':'Events / Ticket Types', '/admin/events/orders':'Events / Orders', '/admin/events/tickets':'Events / Tickets', '/admin/events/checkins':'Events / Check-ins', '/admin/finance':'Finance', '/admin/finance/payments':'Finance / Payments', '/admin/finance/reconciliation':'Finance / Reconciliation', '/admin/finance/refunds':'Finance / Refunds', '/admin/finance/reports':'Finance / Reports', '/admin/communication':'Communication', '/admin/content':'Content', '/admin/users':'Users & Roles', '/admin/audit':'Audit Logs', '/admin/settings':'Settings', '/nominee':'Dashboard', '/nominee/profile':'My Profile', '/nominee/performance':'Vote Performance', '/nominee/campaign':'Campaign Tools', '/nominee/announcements':'Announcements', '/nominee/documents':'Documents', '/nominee/pass':'Ceremony Pass'
  }
  return `${admin ? 'Admin' : 'Nominee'} / ${labels[path] || 'Workspace'}`
}

export function PortalSidebar({ admin = false, open = false, onClose }: { admin?: boolean; open?: boolean; onClose?: () => void }) {
  const path = usePathname()
  return (
    <aside className={`portal-side ${open ? 'portal-side-open' : ''}`}>
      <div className="portal-side-head">
        <Link href="/" onClick={onClose}><Brand /></Link>
        <button className="portal-side-close" aria-label="Close navigation" onClick={onClose}><X size={20}/></button>
      </div>
      <div className="portal-workspace-badge">{admin ? 'Administration' : 'Nominee Portal'}</div>
      <div className="portal-nav-scroll">
        {admin ? adminGroups.map(([group, links]) => (
          <div className="portal-nav-group" key={group}>
            <div className="side-label">{group}</div>
            {links.map(([label, href, Icon]) => (
              <Link onClick={onClose} className={active(path, href) ? 'side-active' : ''} href={href} key={href}>
                <Icon size={16}/><span>{label}</span>
              </Link>
            ))}
          </div>
        )) : (
          <div className="portal-nav-group nominee-nav">
            <div className="side-label">WORKSPACE</div>
            {nomineeLinks.map(([label, href, Icon]) => (
              <Link onClick={onClose} className={active(path, href) ? 'side-active' : ''} href={href} key={href}>
                <Icon size={16}/><span>{label}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
      <div className="side-bottom">
        <Link href="/" onClick={onClose}><ExternalLink size={15}/> View public site</Link>
        <div className="portal-user-row"><span className="user-dot">{admin ? 'AD' : 'MK'}</span><span><b>{admin ? 'Aminata' : 'Mariama Koroma'}</b><small>{admin ? 'Administrator' : 'Nominee · 50MISA26001'}</small></span></div>
      </div>
    </aside>
  )
}

export function PortalHeader({ admin = false, onMenu }: { admin?: boolean; onMenu?: () => void }) {
  const path = usePathname()
  return (
    <header className="portal-header">
      <div className="portal-header-left">
        <button className="portal-mobile-menu" aria-label="Open navigation" onClick={onMenu}><Menu size={21}/></button>
        <span className="crumb">{routeLabel(path, admin)}</span>
      </div>
      <div className="portal-header-actions">
        <span className="environment-badge">Frontend Preview</span>
        <Link className="button secondary compact" href="/">Public site <ArrowUpRight size={14}/></Link>
      </div>
    </header>
  )
}

export function PortalLayout({ children, admin = false }: { children: React.ReactNode; admin?: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <main className="portal">
      <PortalSidebar admin={admin} open={open} onClose={() => setOpen(false)} />
      {open && <button className="portal-overlay" aria-label="Close navigation" onClick={() => setOpen(false)} />}
      <div className="portal-main">
        <PortalHeader admin={admin} onMenu={() => setOpen(true)} />
        {children}
      </div>
    </main>
  )
}

export function PortalDashboard({ admin = false }: { admin?: boolean }) {
  if (!admin) {
    return (
      <div className="portal-content v2-dashboard-page">
        <div className="v2-dashboard-head">
          <div><span className="v2-admin-eyebrow">Nominee Portal · 50MISA26001</span><h1>Campaign dashboard</h1><p>Monitor your public campaign and access the tools provided for the current award edition.</p></div>
          <div className="v2-dashboard-status"><span className="live-indicator"/> Voting window · Demo state</div>
        </div>
        <div className="v2-kpi-grid nominee-kpis">
          <article><span>Total votes</span><strong>1,284</strong><small>Demo data</small></article>
          <article><span>Current rank</span><strong>#04</strong><small>Demo ranking</small></article>
          <article><span>Votes today</span><strong>86</strong><small>Demo data</small></article>
          <article><span>Votes this week</span><strong>326</strong><small>Demo data</small></article>
        </div>
        <div className="v2-dashboard-grid">
          <section className="panel v2-dashboard-card v2-chart-card">
            <div className="v2-card-head"><div><span className="v2-admin-eyebrow">Campaign performance</span><h2>Vote activity</h2></div><StatusBadge>Demo data</StatusBadge></div>
            <div className="v2-bars">{bars.map((b, i) => <i className={i === bars.length - 1 ? 'current' : ''} style={{ height: `${b}%` }} key={i} />)}</div>
            <div className="v2-chart-footer"><span>Voting start</span><span>Current</span></div>
          </section>
          <aside className="v2-nominee-account-card">
            <span className="v2-admin-eyebrow light">Public profile</span>
            <div className="v2-account-avatar">MK</div>
            <h2>Mariama Koroma</h2>
            <p>University of Sierra Leone</p>
            <dl><div><dt>Nominee code</dt><dd>50MISA26001</dd></div><div><dt>Award edition</dt><dd>6th Edition · 2026</dd></div></dl>
            <Link className="button light" href="/vote/50MISA26001">View public voting page <ArrowUpRight size={14}/></Link>
          </aside>
        </div>
        <section className="panel v2-dashboard-actions">
          <div><span className="v2-admin-eyebrow">Campaign tools</span><h2>Quick access</h2></div>
          <div className="v2-quick-action-grid">
            <Link href="/nominee/profile"><UserRound size={17}/><span><b>My Profile</b><small>Review public information</small></span></Link>
            <Link href="/nominee/performance"><TrendingUp size={17}/><span><b>Vote Performance</b><small>Review demo analytics</small></span></Link>
            <Link href="/nominee/campaign"><Share2 size={17}/><span><b>Campaign Tools</b><small>Links, QR and assets</small></span></Link>
            <Link href="/nominee/pass"><BadgeCheck size={17}/><span><b>Ceremony Pass</b><small>Preview digital pass</small></span></Link>
          </div>
        </section>
      </div>
    )
  }

  const operationalStats = [
    ['Active award edition','2026','6th Edition'],
    ['Published nominees','18','Demo data'],
    ['Vote orders','1,284','Demo data'],
    ['Ticket orders','48','Demo data'],
  ]

  return (
    <div className="portal-content v2-dashboard-page">
      <div className="v2-dashboard-head">
        <div><span className="v2-admin-eyebrow">Operations Overview</span><h1>Administration dashboard</h1><p>Monitor the active award edition, public participation, event operations and payment activity.</p></div>
        <div className="v2-dashboard-head-actions"><span className="v2-dashboard-status"><span className="live-indicator"/> Frontend preview</span><Link className="button" href="/admin/awards/nominees">Manage nominees</Link></div>
      </div>

      <div className="v2-kpi-grid">{operationalStats.map(([label,value,note]) => <article key={label}><span>{label}</span><strong>{value}</strong><small>{note}</small></article>)}</div>

      <div className="v2-dashboard-grid admin-dashboard-grid">
        <section className="panel v2-dashboard-card v2-chart-card">
          <div className="v2-card-head"><div><span className="v2-admin-eyebrow">Participation trend</span><h2>Platform activity</h2></div><StatusBadge>Demo data</StatusBadge></div>
          <div className="v2-bars">{bars.map((b, i) => <i className={i === bars.length - 1 ? 'current' : ''} style={{ height: `${b}%` }} key={i} />)}</div>
          <div className="v2-chart-footer"><span>Earlier</span><span>Current</span></div>
        </section>
        <section className="panel v2-attention-card">
          <div className="v2-card-head"><div><span className="v2-admin-eyebrow">Needs attention</span><h2>Operational queue</h2></div><span className="v2-queue-count">4</span></div>
          <div className="v2-attention-list">
            <Link href="/admin/awards/applications"><FileText size={16}/><span><b>12 applications awaiting review</b><small>Awards / Applications</small></span><ArrowUpRight size={14}/></Link>
            <Link href="/admin/finance/reconciliation"><RefreshCw size={16}/><span><b>2 payments require reconciliation</b><small>Finance / Reconciliation</small></span><ArrowUpRight size={14}/></Link>
            <Link href="/admin/events/orders"><Ticket size={16}/><span><b>7 ticket orders pending payment</b><small>Events / Orders</small></span><ArrowUpRight size={14}/></Link>
            <Link href="/admin/awards/results"><Trophy size={16}/><span><b>Results workflow not published</b><small>Awards / Results</small></span><ArrowUpRight size={14}/></Link>
          </div>
        </section>
      </div>

      <section className="panel v2-dashboard-actions">
        <div className="v2-card-head"><div><span className="v2-admin-eyebrow">Operations</span><h2>Primary workspaces</h2></div><Link className="text-button" href="/admin/audit">View audit log <ArrowUpRight size={14}/></Link></div>
        <div className="v2-quick-action-grid admin-actions">
          <Link href="/admin/awards"><Award size={17}/><span><b>Awards</b><small>Editions, nominees and results</small></span></Link>
          <Link href="/admin/awards/voting"><Vote size={17}/><span><b>Voting</b><small>Monitor vote activity</small></span></Link>
          <Link href="/admin/events"><CalendarDays size={17}/><span><b>Events</b><small>Ticketing and check-ins</small></span></Link>
          <Link href="/admin/finance"><WalletCards size={17}/><span><b>Finance</b><small>Payments and reconciliation</small></span></Link>
          <Link href="/scan"><ScanLine size={17}/><span><b>Event Scanner</b><small>Open check-in interface</small></span></Link>
        </div>
      </section>

      <section className="panel v2-recent-activity">
        <div className="v2-card-head"><div><span className="v2-admin-eyebrow">Recent activity</span><h2>Latest operational records</h2></div><StatusBadge>Demo data</StatusBadge></div>
        <div className="v2-activity-table"><div className="head"><span>Activity</span><span>Module</span><span>Reference</span><span>Time</span></div><div><span>Vote order confirmed</span><span>Voting</span><b>VOTE-260184</b><small>20:08</small></div><div><span>Ticket order created</span><span>Events</span><b>ORD-26-00048</b><small>20:04</small></div><div><span>Nominee application reviewed</span><span>Awards</span><b>APP-260031</b><small>19:42</small></div><div><span>Ticket checked in</span><span>Check-ins</span><b>TKT-26-X82F91</b><small>19:31</small></div></div>
      </section>
    </div>
  )
}
