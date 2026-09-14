'use client'

import { useState } from 'react'
import {
  Check,
  Copy,
  Download,
  Share2,
} from 'lucide-react'

export function NomineeCampaignActions({
  nomineeCode,
}: {
  nomineeCode: string
}) {
  const [copied, setCopied] = useState(false)

  function voteUrl() {
    return `${window.location.origin}/vote/${encodeURIComponent(
      nomineeCode,
    )}`
  }

  async function copyLink() {
    await navigator.clipboard.writeText(voteUrl())
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  async function shareLink() {
    const url = voteUrl()

    if (navigator.share) {
      await navigator.share({
        title: `Vote for ${nomineeCode}`,
        text: 'Support my award campaign.',
        url,
      })
      return
    }

    await navigator.clipboard.writeText(url)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="v2-admin-page-actions">
      <button
        className="button light"
        type="button"
        onClick={copyLink}
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
        {copied ? 'Copied' : 'Copy Link'}
      </button>

      <button
        className="v2-light-outline"
        type="button"
        onClick={shareLink}
      >
        <Share2 size={14} /> Share
      </button>

      <a
        className="v2-light-outline"
        href="/api/nominee/campaign/qr?download=1"
      >
        <Download size={14} /> Download QR
      </a>
    </div>
  )
}
