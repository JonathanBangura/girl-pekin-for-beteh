'use client'

import { Check, Copy, ExternalLink, Phone } from 'lucide-react'
import { useState } from 'react'

export function CopyPaymentCode({
  code,
}: {
  code: string
}) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  return (
    <button
      type="button"
      className="button vult-action-primary"
      onClick={copy}
    >
      {copied ? <Check size={17} /> : <Copy size={17} />}
      {copied ? 'Payment Code Copied' : 'Copy Payment Code'}
    </button>
  )
}

export function DialPaymentCode({
  code,
}: {
  code: string
}) {
  const telCode = code.replace(/#/g, '%23')

  return (
    <a
      className="button vult-action-dial"
      href={`tel:${telCode}`}
    >
      <Phone size={17} />
      Dial Now
    </a>
  )
}

export function OpenVultPayment({
  href,
}: {
  href: string
}) {
  return (
    <a className="button vult-action-primary" href={href}>
      Open Vult App
      <ExternalLink size={17} />
    </a>
  )
}
