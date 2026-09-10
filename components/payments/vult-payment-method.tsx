'use client'

import {
  CreditCard,
  Smartphone,
  WalletCards,
} from 'lucide-react'

const methods = [
  {
    value: 'in-app',
    label: 'Vult App',
    description: 'Pay using the Vult app payment flow.',
    icon: Smartphone,
  },
  {
    value: 'card',
    label: 'Card',
    description:
      'Pay by card when card payments are enabled for the merchant.',
    icon: CreditCard,
  },
  {
    value: 'momo',
    label: 'Mobile Money',
    description:
      'Generate a Vult mobile-money payment code.',
    icon: WalletCards,
  },
] as const

export function VultPaymentMethodField({
  disabled = false,
}: {
  disabled?: boolean
}) {
  return (
    <fieldset className="vult-payment-method-field">
      <legend>Payment method</legend>

      <div className="vult-payment-method-grid">
        {methods.map((method, index) => {
          const Icon = method.icon

          return (
            <label
              className="vult-payment-method-card"
              key={method.value}
            >
              <input
                type="radio"
                name="payment_method"
                value={method.value}
                defaultChecked={index === 0}
                disabled={disabled}
              />

              <span className="vult-method-icon">
                <Icon size={18} />
              </span>

              <span>
                <b>{method.label}</b>
                <small>{method.description}</small>
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
