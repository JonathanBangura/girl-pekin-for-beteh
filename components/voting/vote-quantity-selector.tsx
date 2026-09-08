'use client'

import Link from 'next/link'
import { Minus, Plus } from 'lucide-react'
import { useState } from 'react'
import { Pill } from '@/components/public/public'

function money(value: number, currency: string) {
  return `${currency === 'SLE' ? 'NLe' : currency} ${value.toLocaleString()}`
}

export function VoteQuantitySelector({
  nomineeCode,
  unitPrice,
  currency,
  minQuantity,
  maxQuantity,
  quickQuantities,
}: {
  nomineeCode: string
  unitPrice: number
  currency: string
  minQuantity: number
  maxQuantity: number
  quickQuantities: number[]
}) {
  const initial =
    quickQuantities.find(
      (item) => item >= minQuantity && item <= maxQuantity,
    ) ?? minQuantity

  const [quantity, setQuantity] = useState(initial)

  const update = (next: number) => {
    setQuantity(Math.min(maxQuantity, Math.max(minQuantity, next)))
  }

  const total = quantity * unitPrice

  return (
    <>
      <Pill tone="gold">Vote selection</Pill>
      <h2>Choose number of votes</h2>

      {quickQuantities.length > 0 && (
        <div className="vote-quick-grid">
          {quickQuantities
            .filter(
              (option) =>
                option >= minQuantity && option <= maxQuantity,
            )
            .map((option) => (
              <button
                type="button"
                key={option}
                className={quantity === option ? 'active' : ''}
                onClick={() => update(option)}
              >
                {option}
              </button>
            ))}
        </div>
      )}

      <div className="form-field">
        Custom quantity
        <div className="quantity professional-quantity">
          <button
            type="button"
            aria-label="Decrease votes"
            onClick={() => update(quantity - 1)}
          >
            <Minus size={15} />
          </button>

          <input
            className="live-vote-quantity-input"
            type="number"
            min={minQuantity}
            max={maxQuantity}
            value={quantity}
            onChange={(event) => update(Number(event.target.value))}
          />

          <button
            type="button"
            aria-label="Increase votes"
            onClick={() => update(quantity + 1)}
          >
            <Plus size={15} />
          </button>
        </div>
      </div>

      <div className="summary-line">
        <span>Price per vote</span>
        <strong>{money(unitPrice, currency)}</strong>
      </div>

      <div className="summary-total">
        <span>Total</span>
        <strong>{money(total, currency)}</strong>
        <small>{quantity} vote{quantity === 1 ? '' : 's'}</small>
      </div>

      <Link
        className="button checkout-button"
        href={`/vote/${nomineeCode}/checkout?votes=${quantity}`}
      >
        Continue to checkout
      </Link>

      <p className="secure-note">
        The server validates nominee, voting window, quantity and price again
        before creating an order.
      </p>
    </>
  )
}
