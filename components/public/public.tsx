'use client'

import Link from 'next/link'
import { useState } from 'react'
import {
  ArrowUpRight,
  Menu,
  X,
} from 'lucide-react'
import { Brand } from '@/components/brand/brand'

export function Pill({
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

export function Button({
  children,
  onClick,
  secondary = false,
  type = 'button',
}: {
  children: React.ReactNode
  onClick?: () => void
  secondary?: boolean
  type?: 'button' | 'submit' | 'reset'
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={
        secondary ? 'button secondary' : 'button'
      }
    >
      {children}
    </button>
  )
}

const primaryNav = [
  ['About', '/about'],
  ['Programs', '/programs'],
  ['Awards', '/awards'],
  ['Nominees', '/nominees'],
  ['Events', '/events'],
  ['News', '/news'],
] as const

export function PublicHeader() {
  const [open, setOpen] = useState(false)

  return (
    <header className="site-header v2-site-header">
      <Link
        href="/"
        aria-label="Girl Pikin For Betteh Foundation home"
      >
        <Brand />
      </Link>

      <nav
        className="desktop-nav"
        aria-label="Primary navigation"
      >
        {primaryNav.map(([label, href]) => (
          <Link key={href} href={href}>
            {label}
          </Link>
        ))}
      </nav>

      <div className="header-actions">
        <Link
          className="portal-link"
          href="/nominee"
        >
          Nominee Portal
        </Link>
        <Link className="button" href="/vote">
          Vote Now <ArrowUpRight size={14} />
        </Link>
      </div>

      <button
        className="menu-btn"
        aria-label={
          open ? 'Close menu' : 'Open menu'
        }
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {open ? (
          <X size={22} />
        ) : (
          <Menu size={22} />
        )}
      </button>

      {open ? (
        <div
          className="mobile-nav v2-mobile-nav"
          role="dialog"
          aria-label="Mobile navigation"
        >
          {primaryNav.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
            >
              {label}
            </Link>
          ))}
          <Link
            href="/vote"
            onClick={() => setOpen(false)}
          >
            Vote
          </Link>
          <Link
            href="/gallery"
            onClick={() => setOpen(false)}
          >
            Gallery
          </Link>
          <Link
            href="/partners"
            onClick={() => setOpen(false)}
          >
            Partners
          </Link>
          <Link
            href="/contact"
            onClick={() => setOpen(false)}
          >
            Contact
          </Link>

          <div className="mobile-nav-actions">
            <Link
              className="button secondary"
              href="/nominee"
              onClick={() => setOpen(false)}
            >
              Nominee Portal
            </Link>
            <Link
              className="button"
              href="/vote"
              onClick={() => setOpen(false)}
            >
              Vote Now
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  )
}

export function PublicFooter() {
  return (
    <footer className="footer v2-footer">
      <div className="footer-brand">
        <Brand />
        <p>
          Programmes, awards, events and public
          participation from Girl Pikin For Betteh
          Foundation.
        </p>
      </div>

      <div className="footer-links">
        <strong>Organization</strong>
        <Link href="/about">About</Link>
        <Link href="/programs">Programs</Link>
        <Link href="/news">News</Link>
        <Link href="/contact">Contact</Link>
      </div>

      <div className="footer-links">
        <strong>Participation</strong>
        <Link href="/awards">Awards</Link>
        <Link href="/nominees">Nominees</Link>
        <Link href="/vote">Vote</Link>
        <Link href="/events">Events</Link>
      </div>

      <div className="footer-links">
        <strong>More</strong>
        <Link href="/gallery">Gallery</Link>
        <Link href="/partners">Partners</Link>
        <Link href="/results">Results</Link>
        <Link href="/nominee">Nominee Portal</Link>
      </div>

      <div className="footer-bottom">
        <small>
          © 2026 Girl Pikin For Betteh Foundation
        </small>
        <small>
          Official public information and participation
          platform
        </small>
      </div>
    </footer>
  )
}

export function SectionHeading({
  label,
  title,
  copy,
}: {
  label: string
  title: React.ReactNode
  copy?: string
}) {
  return (
    <div className="section-heading v2-section-heading">
      <div>
        <Pill>{label}</Pill>
        <h2>{title}</h2>
      </div>
      {copy ? <p>{copy}</p> : null}
    </div>
  )
}
