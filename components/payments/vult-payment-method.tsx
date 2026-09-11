'use client'

import Image from 'next/image'
import { ShieldCheck } from 'lucide-react'

const methods = [
  {
    value: 'in-app',
    label: 'Vult App',
    description: 'Pay instantly with your Vult App.',
    recommended: true,
  },
  {
    value: 'momo',
    label: 'Mobile Money',
    description: 'Orange Money & Afrimoney accepted.',
    recommended: false,
  },
  {
    value: 'card',
    label: 'Debit/Credit Card',
    description: 'Visa, Mastercard and supported cards.',
    recommended: false,
  },
] as const

function MethodLogo({
  method,
}: {
  method: (typeof methods)[number]['value']
}) {
  if (method === 'in-app') {
    return (
      <div className="vult-payment-brand-box">
        <Image
          src="/LOGOvult-horizontal-DARK-BLUE.svg"
          alt="Vult"
          width={132}
          height={48}
          className="vult-main-logo"
          priority
        />
      </div>
    )
  }

  if (method === 'momo') {
    return (
      <div className="vult-payment-brand-box">
        <Image
          src="/momo.png"
          alt="Orange Money and Afrimoney"
          width={150}
          height={56}
          className="vult-momo-logo"
        />
      </div>
    )
  }

  return (
    <div className="vult-payment-brand-box vult-card-brand-box">
      <Image
        src="/card-icon.png"
        alt=""
        width={74}
        height={48}
        className="vult-card-icon"
        aria-hidden="true"
      />

      <div className="vult-card-network-logos">
        <Image src="/visa.png" alt="Visa" width={52} height={24} />
        <Image
          src="/mastercard.png"
          alt="Mastercard"
          width={46}
          height={28}
        />
      </div>
    </div>
  )
}

export function VultPaymentMethodField({
  disabled = false,
}: {
  disabled?: boolean
}) {
  return (
    <fieldset className="vult-payment-method-field">
      <div className="vult-payment-method-heading">
        <legend>Pay With</legend>

        <span className="vult-secure-payment">
          <ShieldCheck size={15} />
          Secure payment
        </span>
      </div>

      <div className="vult-payment-method-list">
        {methods.map((method, index) => (
          <label
            className="vult-payment-method-card vult-payment-method-card-logo"
            key={method.value}
          >
            <input
              type="radio"
              name="payment_method"
              value={method.value}
              defaultChecked={index === 0}
              disabled={disabled}
            />

            <MethodLogo method={method.value} />

            <span className="vult-payment-method-copy">
              <span className="vult-payment-method-title-row">
                <b>{method.label}</b>
                {method.recommended && (
                  <span className="vult-recommended-badge">
                    Recommended
                  </span>
                )}
              </span>

              <small>{method.description}</small>
            </span>

            <span className="vult-payment-radio" aria-hidden="true" />
          </label>
        ))}
      </div>
    </fieldset>
  )
}
