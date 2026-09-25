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
import { PortalAccount } from '@/components/portal/portal-account'

export function StatusBadge({
  children,
  tone = '',
}: {
  children: React.ReactNode
  tone?: string
}) {
  return (
    <span className={`pill ${tone}`}>
      {children}
    </span>
  )
}

type NavItem = readonly [
  string,
  string,
  React.ComponentType<{ size?: number }>,
]
type NavGroup = readonly [string, readonly NavItem[]]

const adminGroups: readonly NavGroup[] = [
  [
    'MAIN',
    [
      ['Dashboard', '/admin', LayoutDashboard],
      ['Programs', '/admin/programs', GraduationCap],
    ],
  ],
  [
    'AWARDS',
    [
      ['Overview', '/admin/awards', Award],
      ['Editions', '/admin/awards/editions', PanelsTopLeft],
      ['Categories', '/admin/awards/categories', ClipboardList],
      ['Applications', '/admin/awards/applications', FileText],
      ['Nominees', '/admin/awards/nominees', Users],
      ['Voting', '/admin/awards/voting', Vote],
      ['Results', '/admin/awards/results', Trophy],
    ],
  ],
  [
    'EVENTS',
    [
      ['Events', '/admin/events', CalendarDays],
      ['Access & Guests', '/admin/events/access', UserRound],
      ['Ticket Types', '/admin/events/ticket-types', Ticket],
      ['Orders', '/admin/events/orders', Receipt],
      ['Sales Dashboard', '/admin/events/sales', FileBarChart],
      ['Tickets', '/admin/events/tickets', BadgeCheck],
      ['Check-ins', '/admin/events/checkins', ScanLine],
    ],
  ],
  [
    'FINANCE',
    [
      ['Overview', '/admin/finance', WalletCards],
      ['Payments', '/admin/finance/payments', Receipt],
      ['Reconciliation', '/admin/finance/reconciliation', RefreshCw],
      ['Refunds', '/admin/finance/refunds', Undo2],
      ['Reports', '/admin/finance/reports', FileBarChart],
    ],
  ],
  [
    'MANAGEMENT',
    [
      ['Communication', '/admin/communication', Megaphone],
      ['Content', '/admin/content', PanelsTopLeft],
      ['Users & Roles', '/admin/users', ShieldCheck],
      ['Audit Logs', '/admin/audit', ScrollText],
      ['Settings', '/admin/settings', Settings],
    ],
  ],
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
  const exactOnly = new Set([
    '/admin',
    '/nominee',
    '/admin/awards',
    '/admin/events',
    '/admin/finance',
  ])

  if (exactOnly.has(href)) return path === href

  return (
    path === href ||
    path.startsWith(`${href}/`)
  )
}

function routeLabel(path: string, admin: boolean) {
  const labels: Record<string, string> = {
    '/admin': 'Dashboard',
    '/admin/programs': 'Programs',
    '/admin/awards': 'Awards',
    '/admin/awards/editions': 'Awards / Editions',
    '/admin/awards/categories': 'Awards / Categories',
    '/admin/awards/applications': 'Awards / Applications',
    '/admin/awards/nominees': 'Awards / Nominees',
    '/admin/awards/voting': 'Awards / Voting',
    '/admin/awards/results': 'Awards / Results',
    '/admin/events': 'Events',
    '/admin/events/access': 'Events / Access & Guests',
    '/admin/events/ticket-types': 'Events / Ticket Types',
    '/admin/events/orders': 'Events / Orders',
    '/admin/events/sales': 'Events / Sales Dashboard',
    '/admin/events/tickets': 'Events / Tickets',
    '/admin/events/checkins': 'Events / Check-ins',
    '/admin/finance': 'Finance',
    '/admin/finance/payments': 'Finance / Payments',
    '/admin/finance/reconciliation':
      'Finance / Reconciliation',
    '/admin/finance/refunds': 'Finance / Refunds',
    '/admin/finance/reports': 'Finance / Reports',
    '/admin/communication': 'Communication',
    '/admin/content': 'Content',
    '/admin/users': 'Users & Roles',
    '/admin/audit': 'Audit Logs',
    '/admin/settings': 'Settings',
    '/nominee': 'Dashboard',
    '/nominee/profile': 'My Profile',
    '/nominee/performance': 'Vote Performance',
    '/nominee/campaign': 'Campaign Tools',
    '/nominee/announcements': 'Announcements',
    '/nominee/documents': 'Documents',
    '/nominee/pass': 'Ceremony Pass',
  }

  return `${admin ? 'Admin' : 'Nominee'} / ${
    labels[path] || 'Workspace'
  }`
}

export function PortalSidebar({
  admin = false,
  open = false,
  onClose,
}: {
  admin?: boolean
  open?: boolean
  onClose?: () => void
}) {
  const path = usePathname()

  return (
    <aside
      className={`portal-side ${
        open ? 'portal-side-open' : ''
      }`}
    >
      <div className="portal-side-head">
        <Link href="/" onClick={onClose}>
          <Brand />
        </Link>
        <button
          className="portal-side-close"
          aria-label="Close navigation"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>

      <div className="portal-workspace-badge">
        {admin ? 'Administration' : 'Nominee Portal'}
      </div>

      <div className="portal-nav-scroll">
        {admin ? (
          adminGroups.map(([group, links]) => (
            <div
              className="portal-nav-group"
              key={group}
            >
              <div className="side-label">{group}</div>

              {links.map(([label, href, Icon]) => (
                <Link
                  onClick={onClose}
                  className={
                    active(path, href)
                      ? 'side-active'
                      : ''
                  }
                  href={href}
                  key={href}
                >
                  <Icon size={16} />
                  <span>{label}</span>
                </Link>
              ))}
            </div>
          ))
        ) : (
          <div className="portal-nav-group nominee-nav">
            <div className="side-label">
              WORKSPACE
            </div>

            {nomineeLinks.map(
              ([label, href, Icon]) => (
                <Link
                  onClick={onClose}
                  className={
                    active(path, href)
                      ? 'side-active'
                      : ''
                  }
                  href={href}
                  key={href}
                >
                  <Icon size={16} />
                  <span>{label}</span>
                </Link>
              ),
            )}
          </div>
        )}
      </div>

      <div className="side-bottom">
        <Link href="/" onClick={onClose}>
          <ExternalLink size={15} /> View public site
        </Link>
        <PortalAccount />
      </div>
    </aside>
  )
}

export function PortalHeader({
  admin = false,
  onMenu,
}: {
  admin?: boolean
  onMenu?: () => void
}) {
  const path = usePathname()

  return (
    <header className="portal-header">
      <div className="portal-header-left">
        <button
          className="portal-mobile-menu"
          aria-label="Open navigation"
          onClick={onMenu}
        >
          <Menu size={21} />
        </button>

        <span className="crumb">
          {routeLabel(path, admin)}
        </span>
      </div>

      <div className="portal-header-actions">
        <Link
          className="button secondary compact"
          href="/"
        >
          Public site <ArrowUpRight size={14} />
        </Link>
      </div>
    </header>
  )
}

export function PortalLayout({
  children,
  admin = false,
}: {
  children: React.ReactNode
  admin?: boolean
}) {
  const [open, setOpen] = useState(false)

  return (
    <main className="portal">
      <PortalSidebar
        admin={admin}
        open={open}
        onClose={() => setOpen(false)}
      />

      {open ? (
        <button
          className="portal-overlay"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <div className="portal-main">
        <PortalHeader
          admin={admin}
          onMenu={() => setOpen(true)}
        />
        {children}
      </div>
    </main>
  )
}
