'use client'

import { Printer } from 'lucide-react'

export function DonationReceiptActions() {
  return (
    <button
      className="button secondary donation-print-button"
      type="button"
      onClick={() => window.print()}
    >
      <Printer size={16} />
      Print / Save as PDF
    </button>
  )
}
