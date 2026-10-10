'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { VultPaymentMethodField } from '@/components/payments/vult-payment-method'
import type { PublicDonationCampaign } from '@/lib/donations/public-data'

function money(value: number, currency: string) {
  const label = currency === 'SLE' ? 'NLe' : currency
  return `${label} ${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function DonationForm({
  campaigns,
  selectedCampaignId,
  lockCampaign = false,
}: {
  campaigns: PublicDonationCampaign[]
  selectedCampaignId?: string | null
  lockCampaign?: boolean
}) {
  const router = useRouter()
  const [campaignId, setCampaignId] = useState(
    selectedCampaignId || campaigns[0]?.id || '',
  )
  const [amount, setAmount] = useState('')
  const [donorType, setDonorType] = useState<
    'individual' | 'organisation'
  >('individual')
  const [anonymous, setAnonymous] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedCampaign = useMemo(
    () =>
      campaigns.find((campaign) => campaign.id === campaignId) ??
      campaigns[0] ??
      null,
    [campaignId, campaigns],
  )

  const presetAmounts = useMemo(() => {
    const minimum = selectedCampaign?.minimum_amount ?? 10
    const base = [100, 250, 500, 1000].filter(
      (value) => value >= minimum,
    )

    if (!base.length) return [minimum]
    if (!base.includes(minimum) && minimum > 100) {
      return [minimum, ...base].slice(0, 4)
    }

    return base
  }, [selectedCampaign])

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const form = new FormData(event.currentTarget)
    const numericAmount = Number(amount)

    if (!selectedCampaign) {
      setError('Please select a donation fund or campaign.')
      return
    }

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount < selectedCampaign.minimum_amount
    ) {
      setError(
        `The minimum donation for this fund is ${money(
          selectedCampaign.minimum_amount,
          selectedCampaign.currency,
        )}.`,
      )
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch('/api/donations/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          campaign_id: selectedCampaign.id,
          amount: numericAmount,
          payment_method: String(
            form.get('payment_method') || '',
          ),
          donor_type: donorType,
          donor_name: String(form.get('donor_name') || ''),
          organisation_name: String(
            form.get('organisation_name') || '',
          ),
          donor_email: String(form.get('donor_email') || ''),
          donor_phone: String(form.get('donor_phone') || ''),
          is_anonymous: anonymous,
          message: String(form.get('message') || ''),
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result.error || 'Unable to start your donation.',
        )
      }

      if (!result.status_url) {
        throw new Error(
          'The donation was created but the payment page was not returned.',
        )
      }

      router.push(result.status_url)
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Unable to start your donation.',
      )
      setSubmitting(false)
    }
  }

  if (!selectedCampaign) {
    return (
      <div className="panel donation-empty">
        <strong>No donation fund is currently open.</strong>
        <p>
          Please check again later or contact the Foundation.
        </p>
      </div>
    )
  }

  return (
    <form
      className="panel donation-form"
      onSubmit={submit}
    >
      <div className="donation-form-head">
        <span className="v2-overline">Donation details</span>
        <h2>Make a one-time contribution</h2>
        <p>
          Choose the fund, enter your contribution and complete
          payment securely with Vult App, Mobile Money or Card.
        </p>
      </div>

      <div className="donation-form-grid">
        <label className="full">
          Support
          {lockCampaign ? (
            <>
              <input
                type="hidden"
                name="campaign_id"
                value={selectedCampaign.id}
              />
              <div className="donation-selected-fund">
                <strong>{selectedCampaign.title}</strong>
                <small>
                  {selectedCampaign.fund_type === 'unrestricted'
                    ? 'Unrestricted support'
                    : 'Designated campaign support'}
                </small>
              </div>
            </>
          ) : (
            <select
              name="campaign_id"
              value={campaignId}
              onChange={(event) => {
                setCampaignId(event.target.value)
                setAmount('')
              }}
            >
              {campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.title}
                </option>
              ))}
            </select>
          )}
        </label>

        <label className="full">
          Donation amount ({selectedCampaign.currency})
          <input
            name="amount"
            type="number"
            inputMode="decimal"
            min={selectedCampaign.minimum_amount}
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder={String(selectedCampaign.minimum_amount)}
            required
          />
          <small>
            Minimum:{' '}
            {money(
              selectedCampaign.minimum_amount,
              selectedCampaign.currency,
            )}
          </small>
        </label>

        <div className="full donation-presets">
          {presetAmounts.map((value) => (
            <button
              className="button secondary compact"
              key={value}
              type="button"
              onClick={() => setAmount(String(value))}
            >
              {money(value, selectedCampaign.currency)}
            </button>
          ))}
        </div>

        <label>
          Donating as
          <select
            name="donor_type"
            value={donorType}
            onChange={(event) =>
              setDonorType(
                event.target.value === 'organisation'
                  ? 'organisation'
                  : 'individual',
              )
            }
          >
            <option value="individual">Individual</option>
            <option value="organisation">Organisation</option>
          </select>
        </label>

        {donorType === 'organisation' ? (
          <>
            <label>
              Organisation name
              <input
                name="organisation_name"
                maxLength={180}
                required={!anonymous}
              />
            </label>

            <label>
              Contact person <small>(optional)</small>
              <input
                name="donor_name"
                maxLength={160}
              />
            </label>
          </>
        ) : (
          <label>
            Full name
            <input
              name="donor_name"
              maxLength={160}
              required={!anonymous}
            />
          </label>
        )}

        <label>
          Email
          <input
            name="donor_email"
            type="email"
            maxLength={180}
            placeholder="For your acknowledgement"
          />
        </label>

        <label>
          Phone
          <input
            name="donor_phone"
            type="tel"
            maxLength={40}
          />
        </label>

        <label className="full donation-check">
          <input
            type="checkbox"
            checked={anonymous}
            onChange={(event) =>
              setAnonymous(event.target.checked)
            }
          />
          <span>
            Display this donation as anonymous in acknowledgements and donor-facing records. Authorised staff may still retain payment contact details.
          </span>
        </label>

        <label className="full">
          Message or dedication <small>(optional)</small>
          <textarea
            name="message"
            maxLength={500}
            rows={4}
            placeholder="Add a short message to the Foundation."
          />
        </label>
      </div>

      <VultPaymentMethodField disabled={submitting} />

      {error ? (
        <div className="live-form-message error donation-error">
          {error}
        </div>
      ) : null}

      <div className="donation-payment-summary">
        <span>Contribution</span>
        <strong>
          {money(
            Number(amount) || 0,
            selectedCampaign.currency,
          )}
        </strong>
      </div>

      <button
        className="button donation-submit"
        type="submit"
        disabled={submitting}
      >
        {submitting ? (
          <>
            <Loader2 size={17} className="donation-spinner" />
            Preparing secure payment…
          </>
        ) : (
          'Donate securely'
        )}
      </button>

      <p className="donation-disclaimer">
        Donations are voluntary contributions to support the work
        of Girl Pikin For Betteh Foundation. Please review the
        amount before confirming payment. This checkout does not
        represent that a donation is tax-deductible.
      </p>
    </form>
  )
}
