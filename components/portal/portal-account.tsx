'use client'

import { useEffect, useMemo, useState } from 'react'
import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type AccountState = { fullName: string; roleLabel: string }

const roleLabels: Record<string, string> = {
  super_admin: 'Super Admin',
  awards_manager: 'Awards Manager',
  nomination_officer: 'Nomination Officer',
  voting_manager: 'Voting Manager',
  event_manager: 'Event Manager',
  finance_officer: 'Finance Officer',
  checkin_officer: 'Check-In Officer',
  content_manager: 'Content Manager',
  auditor: 'Auditor',
  nominee: 'Nominee',
}

const rolePriority = [
  'super_admin',
  'awards_manager',
  'nomination_officer',
  'voting_manager',
  'event_manager',
  'finance_officer',
  'checkin_officer',
  'content_manager',
  'auditor',
  'nominee',
]

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'U'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

export function PortalAccount() {
  const [account, setAccount] = useState<AccountState>({
    fullName: 'Signed in user',
    roleLabel: 'Loading account…',
  })

  useEffect(() => {
    let cancelled = false

    async function loadAccount() {
      const supabase = createClient()
      const { data: claimsData } = await supabase.auth.getClaims()
      const userId = claimsData?.claims?.sub

      if (!userId || cancelled) return

      const [{ data: profile }, { data: roleCodes }] = await Promise.all([
        supabase.from('profiles').select('full_name').eq('id', userId).maybeSingle(),
        supabase.rpc('current_role_codes'),
      ])

      if (cancelled) return

      const email = typeof claimsData?.claims?.email === 'string'
        ? claimsData.claims.email
        : ''

      const fullName =
        profile?.full_name?.trim() ||
        email.split('@')[0] ||
        'Signed in user'

      const codes = Array.isArray(roleCodes)
        ? roleCodes.filter((value): value is string => typeof value === 'string')
        : []

      const primaryRole =
        rolePriority.find((role) => codes.includes(role)) || codes[0]

      setAccount({
        fullName,
        roleLabel: primaryRole
          ? roleLabels[primaryRole] || primaryRole.replaceAll('_', ' ')
          : 'User',
      })
    }

    loadAccount()
    return () => { cancelled = true }
  }, [])

  const userInitials = useMemo(() => initials(account.fullName), [account.fullName])

  return (
    <div className="portal-account">
      <div className="portal-user-row">
        <span className="user-dot">{userInitials}</span>
        <span>
          <b>{account.fullName}</b>
          <small>{account.roleLabel}</small>
        </span>
      </div>

      <form action="/auth/signout" method="post">
        <button className="portal-signout-button" type="submit">
          <LogOut size={15} />
          <span>Sign out</span>
        </button>
      </form>
    </div>
  )
}
